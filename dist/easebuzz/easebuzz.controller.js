"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EasebuzzController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const axios_1 = require("axios");
const jwt = require("jsonwebtoken");
const sign_1 = require("../utils/sign");
const sign_2 = require("../utils/sign");
const easebuzz_service_1 = require("./easebuzz.service");
let EasebuzzController = class EasebuzzController {
    constructor(easebuzzService, databaseService) {
        this.easebuzzService = easebuzzService;
        this.databaseService = databaseService;
    }
    async getQr(res, req) {
        try {
            const collect_id = req.query.collect_id;
            if (!collect_id) {
                throw new common_1.NotFoundException('collect_id not found');
            }
            const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id).select('deepLink');
            if (!collectReq) {
                throw new common_1.NotFoundException('Collect request not found');
            }
            const baseUrl = collectReq.deepLink;
            const phonePe = baseUrl.replace('upi:', 'phonepe:');
            const googlePe = 'tez://' + baseUrl;
            const paytm = baseUrl.replace('upi:', 'paytmmp:');
            return res.send({
                qr_code: collectReq.deepLink,
                phonePe,
                googlePe,
                paytm,
            });
        }
        catch (error) {
            console.log(error);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getEncryptedInfo(res, req, body) {
        const { card_number, card_holder, card_cvv, card_exp } = req.query;
        console.log('encrypting key and iv');
        const { key, iv } = await (0, sign_1.merchantKeySHA256)();
        console.log('key and iv generated', { key, iv });
        console.log(`encrypting data: ${card_number}`);
        const enc_card_number = await (0, sign_2.encryptCard)(card_number, key, iv);
        const enc_card_holder = await (0, sign_2.encryptCard)(card_holder, key, iv);
        const enc_card_cvv = await (0, sign_2.encryptCard)(card_cvv, key, iv);
        const enc_card_exp = await (0, sign_2.encryptCard)(card_exp, key, iv);
        const decrypt_card_number = await (0, sign_1.decrypt)(enc_card_number, key, iv);
        const decrypt_cvv = await (0, sign_1.decrypt)(enc_card_cvv, key, iv);
        const decrypt_exp = await (0, sign_1.decrypt)(enc_card_exp, key, iv);
        const decrypt_card_holder_name = await (0, sign_1.decrypt)(enc_card_holder, key, iv);
        console.log(decrypt_card_holder_name, decrypt_cvv, decrypt_card_number, decrypt_exp);
        return res.send({
            card_number: enc_card_number,
            card_holder: enc_card_holder,
            card_cvv: enc_card_cvv,
            card_exp: enc_card_exp,
        });
    }
    async getRefundhash(req) {
        const { collect_id, refund_amount, refund_id } = req.query;
        const hashStringV2 = `${process.env.EASEBUZZ_KEY}|${refund_id}|${collect_id}|${parseFloat(refund_amount)
            .toFixed(1)
            .toString()}|${process.env.EASEBUZZ_SALT}`;
        let hash2 = await (0, sign_1.calculateSHA512Hash)(hashStringV2);
        const data2 = {
            key: process.env.EASEBUZZ_KEY,
            merchant_refund_id: refund_id,
            easebuzz_id: collect_id,
            refund_amount: parseFloat(refund_amount).toFixed(1),
            hash: hash2,
        };
        const config = {
            method: 'POST',
            url: `https://dashboard.easebuzz.in/transaction/v2/refund`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: data2,
        };
        try {
            const response = await (0, axios_1.default)(config);
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async checkRefund(req) {
        return await this.easebuzzService.checkRefundSttaus(req.query.collect_id);
    }
    async settlementRecon(body) {
        try {
            const { submerchant_id, start_date, end_date, page_size, token } = body;
            if (!token)
                throw new common_1.BadRequestException('Token is required');
            const data = jwt.verify(token, process.env.PAYMENTS_SERVICE_SECRET);
            if (!data)
                throw new common_1.BadRequestException('Request Forged');
            if (data.submerchant_id !== submerchant_id)
                throw new common_1.BadRequestException('Request Forged');
            const hashString = `${process.env.EASEBUZZ_KEY}|${start_date}|${end_date}|${process.env.EASEBUZZ_SALT}`;
            const hash = await (0, sign_1.calculateSHA512Hash)(hashString);
            const payload = {
                merchant_key: process.env.EASEBUZZ_KEY,
                payout_date: {
                    start_date,
                    end_date,
                },
                page_size,
                hash,
                submerchant_id,
            };
            const config = {
                method: 'post',
                url: `https://dashboard.easebuzz.in/settlements/v1/retrieve`,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                data: payload,
            };
            const { data: resData } = await axios_1.default.request(config);
            const orderIds = resData?.data[0]?.peb_transactions.map((data) => data?.txnid);
            const customOrders = await this.databaseService.CollectRequestModel.find({
                _id: { $in: orderIds },
            });
            const customOrderMap = new Map(customOrders.map((doc) => [
                doc._id.toString(),
                {
                    custom_order_id: doc.custom_order_id,
                    school_id: doc.school_id,
                    additional_data: doc.additional_data,
                },
            ]));
            const enrichedOrders = resData?.data[0]?.peb_transactions.map((order) => {
                let customData = {};
                let additionalData = {};
                if (order.txnid) {
                    customData = customOrderMap.get(order.txnid) || {};
                    additionalData = JSON.parse(customData?.additional_data);
                }
                return {
                    ...order,
                    custom_order_id: customData.custom_order_id || null,
                    school_id: customData.school_id || null,
                    student_id: additionalData?.student_details?.student_id || null,
                    student_name: additionalData.student_details?.student_name || null,
                    student_email: additionalData.student_details?.student_email || null,
                    student_phone_no: additionalData.student_details?.student_phone_no || null,
                };
            });
            return {
                transactions: enrichedOrders,
                split_payouts: resData?.data[0]?.split_payouts,
                peb_refunds: resData?.data[0]?.peb_refunds,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something Went Wrong');
        }
    }
    async updateEasebuzzDispute(body) {
        try {
            const { case_id, action, reason, documents, sign } = body;
            const decodedToken = jwt.verify(sign, process.env.KEY);
            if (!decodedToken)
                throw new common_1.BadRequestException('Request Forged');
            if (decodedToken.action !== action || decodedToken.case_id !== case_id)
                throw new common_1.BadRequestException('Request Forged');
            const data = await this.easebuzzService.updateDispute(case_id, action, reason, documents);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
};
exports.EasebuzzController = EasebuzzController;
__decorate([
    (0, common_1.Get)('/upiqr'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getQr", null);
__decorate([
    (0, common_1.Get)('/encrypted-info'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getEncryptedInfo", null);
__decorate([
    (0, common_1.Get)('/refundhash'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getRefundhash", null);
__decorate([
    (0, common_1.Get)('/refund-status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "checkRefund", null);
__decorate([
    (0, common_1.Post)('/settlement-recon'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "settlementRecon", null);
__decorate([
    (0, common_1.Post)('/update-dispute'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "updateEasebuzzDispute", null);
exports.EasebuzzController = EasebuzzController = __decorate([
    (0, common_1.Controller)('easebuzz'),
    __metadata("design:paramtypes", [easebuzz_service_1.EasebuzzService,
        database_service_1.DatabaseService])
], EasebuzzController);
//# sourceMappingURL=easebuzz.controller.js.map