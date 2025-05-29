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
exports.PosPaytmService = void 0;
const common_1 = require("@nestjs/common");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const Paytm = require('paytmchecksum');
const axios_1 = require("axios");
const database_service_1 = require("../database/database.service");
const mongoose_1 = require("mongoose");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
let PosPaytmService = class PosPaytmService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async nowInIST() {
        return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    }
    async fmt(d) {
        return d.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    }
    async initiatePOSPayment(request) {
        try {
            if (!request.paytmPos) {
                throw new common_1.BadRequestException('Error in Fetching POS Details');
            }
            const { paytmPos } = request;
            const body = {
                paytmMid: paytmPos.paytmMid,
                paytmTid: paytmPos.paytmTid,
                transactionDateTime: await this.fmt(await this.nowInIST()),
                merchantTransactionId: request._id.toString(),
                merchantReferenceNo: request._id.toString(),
                transactionAmount: String(Math.round(request.amount * 100)),
                callbackUrl: request.callbackUrl,
            };
            var checksum = await Paytm.generateSignature(body, paytmPos.paytm_merchant_key);
            var isVerifySignature = await Paytm.verifySignature(body, paytmPos.paytm_merchant_key, checksum);
            if (!isVerifySignature) {
                throw new common_1.BadRequestException('Checksum verification failed');
            }
            const requestData = {
                head: {
                    requestTimeStamp: await this.fmt(await this.nowInIST()),
                    channelId: paytmPos.channel_id,
                    checksum: checksum,
                },
                body: body,
            };
            const config = {
                url: `${process.env.PAYTM_POS_BASEURL}/ecr/payment/request`,
                method: 'post',
                maxBodyLength: Infinity,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(requestData),
            };
            const response = await axios_1.default.request(config);
            console.log('Paytm POS Payment Response:', response.data);
            return {
                requestSent: requestData,
                paytmResponse: response.data,
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async collectPayment(amount, callbackUrl, school_id, trustee_id, paytm_pos, platform_charges, additional_data, custom_order_id, req_webhook_urls, school_name) {
        try {
            const request = await this.databaseService.CollectRequestModel.create({
                amount,
                callbackUrl,
                gateway: collect_request_schema_1.Gateway.PAYTM_POS,
                req_webhook_urls,
                school_id,
                trustee_id,
                additional_data: JSON.stringify(additional_data),
                custom_order_id: custom_order_id || null,
                paytmPos: paytm_pos,
                isPosTransaction: true,
            });
            await new this.databaseService.CollectRequestStatusModel({
                collect_id: request._id,
                status: collect_req_status_schema_1.PaymentStatus.PENDING,
                order_amount: request.amount,
                transaction_amount: request.amount,
                payment_method: null,
            }).save();
            return await this.initiatePOSPayment(request);
        }
        catch (error) {
            console.error(error);
            throw new common_1.BadRequestException({
                message: 'Payment request error',
                error: error.message,
            });
        }
    }
    async getTransactionStatus(orderId) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(orderId);
            if (!collectRequest) {
                throw new common_1.BadRequestException('collect request not found');
            }
            const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: new mongoose_1.Types.ObjectId(orderId),
            });
            if (!collectRequestStatus) {
                throw new common_1.BadRequestException('collect request status not found');
            }
            const body = {
                paytmMid: collectRequest.pos_machine_device_id,
                paytmTid: collectRequest.pos_machine_device_code,
                transactionDateTime: collectRequestStatus.payment_time
                    .toISOString()
                    .slice(0, 19)
                    .replace('T', ' '),
                merchantTransactionId: orderId,
            };
            const checksum = await Paytm.generateSignature(JSON.stringify(body), process.env.PAYTM_MERCHANT_KEY || 'n/a');
            const requestData = {
                head: {
                    requestTimeStamp: collectRequestStatus.payment_time
                        .toISOString()
                        .slice(0, 19)
                        .replace('T', ' '),
                    channelId: 'RIL',
                    checksum: checksum,
                    version: '3.1',
                },
                body: body,
            };
            const config = {
                url: `${process.env.PAYTM_POS_BASEURL}/ecr/V2/payment/status`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(requestData),
            };
            const response = await axios_1.default.request(config);
            return response.data;
        }
        catch (error) {
            console.error('Error fetching transaction status:', error);
            throw new common_1.BadRequestException('Failed to fetch transaction status.');
        }
    }
};
exports.PosPaytmService = PosPaytmService;
exports.PosPaytmService = PosPaytmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], PosPaytmService);
//# sourceMappingURL=pos-paytm.service.js.map