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
exports.PosPaytmController = void 0;
const common_1 = require("@nestjs/common");
const pos_paytm_service_1 = require("./pos-paytm.service");
const _jwt = require("jsonwebtoken");
const database_service_1 = require("../database/database.service");
const jwt = require("jsonwebtoken");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const axios_1 = require("axios");
const Paytm = require('paytmchecksum');
let PosPaytmController = class PosPaytmController {
    constructor(posPaytmService, databaseService, edvironPgService) {
        this.posPaytmService = posPaytmService;
        this.databaseService = databaseService;
        this.edvironPgService = edvironPgService;
    }
    async initiatePayment(body) {
        const { amount, callbackUrl, jwt, school_id, trustee_id, paytm_pos, platform_charges, additional_data, custom_order_id, req_webhook_urls, school_name, } = body;
        if (!jwt)
            throw new common_1.BadRequestException('JWT not provided');
        if (!amount)
            throw new common_1.BadRequestException('Amount not provided');
        try {
            const decrypt = _jwt.verify(jwt, process.env.KEY);
            if (decrypt.school_id !== school_id) {
                throw new common_1.BadRequestException(`Request Fordge`);
            }
            return await this.posPaytmService.collectPayment(amount, callbackUrl, school_id, trustee_id, paytm_pos, platform_charges, additional_data, custom_order_id, req_webhook_urls, school_name);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async PosCallback(body, res) {
        try {
            const { head, body: bodyData } = body;
            const { paytmMid, paytmTid, transactionDateTime, merchantTransactionId, merchantReferenceNo, transactionAmount, acquirementId, retrievalReferenceNo, authCode, issuerMaskCardNo, issuingBankName, bankResponseCode, bankResponseMessage, bankMid, bankTid, merchantExtendedInfo, extendedInfo, acquiringBank, resultInfo, } = bodyData;
            const checksum = head.checksum;
            const request = await this.databaseService.CollectRequestModel.findById(merchantTransactionId);
            if (!request) {
                throw new common_1.BadRequestException('Invalid merchantTransactionId ');
            }
            const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: request._id,
            });
            if (!requestStatus) {
                throw new common_1.BadRequestException('Invalid transaction id ');
            }
            if (requestStatus && requestStatus.status === 'SUCCESS') {
                res.status(200).send('OK');
                return;
            }
            const { paytmPos } = request;
            let flatParams = {};
            Object.keys(bodyData).forEach((key) => {
                if (typeof bodyData[key] !== 'object') {
                    flatParams[key] = String(bodyData[key]);
                }
            });
            const isVerifySignature = await Paytm.verifySignature(flatParams, paytmPos.paytm_merchant_key, checksum);
            if (!isVerifySignature) {
                throw new common_1.BadRequestException(`Error in Verifying Checksum`);
            }
            const { body: paymentStatus } = await this.posPaytmService.getTransactionStatus(merchantTransactionId);
            let payment_method = '';
            let details = {};
            let platform_type = '';
            let payment_mode = 'Others';
            const { resultStatus, resultCode, resultMsg, resultCodeId } = paymentStatus.resultInfo;
            switch (paymentStatus.payMethod) {
                case 'CREDIT_CARD':
                    payment_method = 'credit_card';
                    payment_mode = paymentStatus.cardScheme.toLocaleLowerCase();
                    platform_type = paymentStatus.cardScheme.toLocaleLowerCase();
                    details = {
                        card: {
                            card_bank_name: paymentStatus.issuingBankName,
                            card_country: 'IN',
                            card_network: paymentStatus.cardScheme.toLocaleLowerCase(),
                            card_number: paymentStatus.issuerMaskCardNo,
                            card_sub_type: '',
                            card_type: 'credit_card',
                            channel: null,
                        },
                    };
                    break;
                case 'DEBIT_CARD':
                    payment_method = 'debit_card';
                    payment_mode = paymentStatus.cardScheme.toLocaleLowerCase();
                    platform_type = paymentStatus.cardScheme.toLocaleLowerCase();
                    details = {
                        card: {
                            card_bank_name: paymentStatus.issuingBankName,
                            card_country: 'IN',
                            card_network: paymentStatus.cardScheme.toLocaleLowerCase(),
                            card_number: paymentStatus.issuerMaskCardNo,
                            card_sub_type: '',
                            card_type: 'debit_card',
                            channel: null,
                        },
                    };
                    break;
                case 'UPI':
                    payment_method = 'upi';
                    payment_mode = 'Others';
                    platform_type = 'Others';
                    details = {
                        upi: {
                            upi_id: 'NA',
                        },
                    };
                    break;
            }
            if (resultStatus === 'SUCCESS') {
                try {
                    const tokenData = {
                        school_id: request?.school_id,
                        trustee_id: request?.trustee_id,
                        order_amount: requestStatus?.order_amount,
                        transaction_amount: paymentStatus.transactionAmount / 100,
                        platform_type,
                        payment_mode,
                        collect_id: request?._id,
                    };
                    const _jwt = jwt.sign(tokenData, process.env.KEY, {
                        noTimestamp: true,
                    });
                    let data = JSON.stringify({
                        token: _jwt,
                        school_id: request?.school_id,
                        trustee_id: request?.trustee_id,
                        order_amount: requestStatus?.order_amount,
                        transaction_amount: paymentStatus.transactionAmount,
                        platform_type,
                        payment_mode,
                        collect_id: request?._id,
                    });
                    let config = {
                        method: 'post',
                        maxBodyLength: Infinity,
                        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/add-commission`,
                        headers: {
                            accept: 'application/json',
                            'content-type': 'application/json',
                            'x-api-version': '2023-08-01',
                        },
                        data: data,
                    };
                    try {
                        const { data: commissionRes } = await axios_1.default.request(config);
                        console.log(commissionRes, 'Commission saved');
                    }
                    catch (e) {
                        console.log(`failed to save commision ${e.message}`);
                    }
                }
                catch (e) { }
            }
            const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                collect_id: request._id,
            }, {
                $set: {
                    status: resultStatus,
                    transaction_amount: transactionAmount,
                    payment_method,
                    details: JSON.stringify(details),
                    bank_reference: retrievalReferenceNo,
                    payment_time: new Date(transactionDateTime),
                },
            }, {
                upsert: true,
                new: true,
            });
            const webHookUrl = request.req_webhook_urls;
            if (webHookUrl && webHookUrl.length > 0) {
                try {
                    const transactionTime = requestStatus.payment_time;
                    const amount = request?.amount;
                    const custom_order_id = request?.custom_order_id || '';
                    const additional_data = request?.additional_data || '';
                    const webHookDataInfo = {
                        collect_id: request._id,
                        amount,
                        status: resultStatus,
                        trustee_id: request.trustee_id,
                        school_id: request.school_id,
                        req_webhook_urls: request?.req_webhook_urls,
                        custom_order_id,
                        createdAt: requestStatus?.createdAt,
                        transaction_time: transactionDateTime,
                        additional_data,
                        details: requestStatus.details,
                        transaction_amount: requestStatus.transaction_amount,
                        bank_reference: requestStatus.bank_reference,
                        payment_method: requestStatus.payment_method,
                        payment_details: requestStatus.details,
                        formattedDate: `${transactionTime.getFullYear()}-${String(transactionTime.getMonth() + 1).padStart(2, '0')}-${String(transactionTime.getDate()).padStart(2, '0')}`,
                    };
                    if (webHookUrl !== null) {
                        console.log('calling webhook');
                        if (request?.trustee_id.toString() ===
                            '66505181ca3e97e19f142075') {
                            console.log('Webhook called for webschool');
                            setTimeout(async () => {
                                await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo);
                            }, 60000);
                        }
                        else {
                            console.log('Webhook called for other schools');
                            await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo);
                        }
                    }
                }
                catch (e) { }
            }
            res.status(200).send('OK');
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
        return true;
    }
    async checkStatus(collect_id) {
        return await this.posPaytmService.getTransactionStatus(collect_id);
    }
};
exports.PosPaytmController = PosPaytmController;
__decorate([
    (0, common_1.Post)('/initiate-payment'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PosPaytmController.prototype, "initiatePayment", null);
__decorate([
    (0, common_1.Post)('callback'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PosPaytmController.prototype, "PosCallback", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PosPaytmController.prototype, "checkStatus", null);
exports.PosPaytmController = PosPaytmController = __decorate([
    (0, common_1.Controller)('pos-paytm'),
    __metadata("design:paramtypes", [pos_paytm_service_1.PosPaytmService,
        database_service_1.DatabaseService,
        edviron_pg_service_1.EdvironPgService])
], PosPaytmController);
//# sourceMappingURL=pos-paytm.controller.js.map