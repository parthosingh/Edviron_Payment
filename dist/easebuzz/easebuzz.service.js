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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EasebuzzService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const sign_1 = require("../utils/sign");
const axios_1 = require("axios");
let EasebuzzService = class EasebuzzService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async easebuzzCheckStatus(collect_request_id, collect_request) {
        const amount = parseFloat(collect_request.amount.toString()).toFixed(1);
        const axios = require('axios');
        let hashData = process.env.EASEBUZZ_KEY +
            '|' +
            collect_request_id +
            '|' +
            amount.toString() +
            '|' +
            'noreply@edviron.com' +
            '|' +
            '9898989898' +
            '|' +
            process.env.EASEBUZZ_SALT;
        let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
        const qs = require('qs');
        const data = qs.stringify({
            txnid: collect_request_id,
            key: process.env.EASEBUZZ_KEY,
            amount: amount,
            email: 'noreply@edviron.com',
            phone: '9898989898',
            hash: hash,
        });
        const config = {
            method: 'POST',
            url: `https://dashboard.easebuzz.in/transaction/v1/retrieve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: data,
        };
        const { data: statusRes } = await axios.request(config);
        console.log(statusRes);
        return statusRes;
    }
    async statusResponse(requestId, collectReq) {
        let statusResponse = await this.easebuzzCheckStatus(requestId, collectReq);
        if (statusResponse.msg.mode === 'NA') {
            console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
            statusResponse = await this.easebuzzCheckStatus(`upi_${requestId}`, collectReq);
        }
        return statusResponse;
    }
    async initiateRefund(collect_id, refund_amount, refund_id) {
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Collect Request not found');
        }
        const transaction = await this.statusResponse(collect_id, collectRequest);
        console.log(transaction.msg.easepayid);
        const order_id = transaction.msg.easepayid;
        if (!order_id) {
            throw new common_1.BadRequestException('Order ID not found');
        }
        const hashStringV2 = `${process.env.EASEBUZZ_KEY}|${refund_id}|${order_id}|${refund_amount.toFixed(1)}|${process.env.EASEBUZZ_SALT}`;
        let hash2 = await (0, sign_1.calculateSHA512Hash)(hashStringV2);
        const data2 = {
            key: process.env.EASEBUZZ_KEY,
            merchant_refund_id: refund_id,
            easebuzz_id: order_id,
            refund_amount: refund_amount.toFixed(1),
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
            console.log('initiating refund with easebuzz');
            const response = await (0, axios_1.default)(config);
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async checkRefundSttaus(collect_id) {
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Collect Request not found');
        }
        const transaction = await this.statusResponse(collect_id, collectRequest);
        console.log(transaction.msg.easepayid);
        const order_id = transaction.msg.easepayid;
        if (!order_id) {
            throw new common_1.BadRequestException('Order ID not found');
        }
        const hashString = `${process.env.EASEBUZZ_KEY}|${order_id}|${process.env.EASEBUZZ_SALT}`;
        let hash = await (0, sign_1.calculateSHA512Hash)(hashString);
        const data = {
            key: process.env.EASEBUZZ_KEY,
            easebuzz_id: order_id,
            hash: hash,
        };
        const config = {
            method: 'POST',
            url: `https://dashboard.easebuzz.in/refund/v1/retrieve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: data,
        };
        try {
            console.log('checking refund status with easebuzz');
            const response = await (0, axios_1.default)(config);
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getQrBase64(collect_id) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.BadRequestException('Collect Request not found');
            }
            collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
            await collectRequest.save();
            const upiIntentUrl = collectRequest.deepLink;
            var QRCode = require('qrcode');
            const qrCodeBase64 = await QRCode.toDataURL(upiIntentUrl, {
                margin: 2,
                width: 300,
            });
            return {
                intentUrl: upiIntentUrl,
                qrCodeBase64: qrCodeBase64,
                collect_id,
            };
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async updateDispute(case_id, action, reason, documents) {
        const hash = await (0, sign_1.calculateSHA512Hash)(process.env.EASEBUZZ_KEY);
        const config = {
            method: 'post',
            url: `https://drs.easebuzz.in/api/v1/merchant/case/update_status/`,
            headers: {
                key: process.env.EASEBUZZ_KEY,
                hash,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: {
                case_id: case_id,
                action: action,
                reason: reason,
                documents: documents,
            },
        };
        try {
            const { data } = await axios_1.default.request(config);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
};
exports.EasebuzzService = EasebuzzService;
exports.EasebuzzService = EasebuzzService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EasebuzzService);
//# sourceMappingURL=easebuzz.service.js.map