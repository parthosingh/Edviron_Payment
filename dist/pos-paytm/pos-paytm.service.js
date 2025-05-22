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
const PaytmChecksum = require("paytmchecksum");
const axios_1 = require("axios");
const database_service_1 = require("../database/database.service");
const mongoose_1 = require("mongoose");
let PosPaytmService = class PosPaytmService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async initiatePOSPayment(collectRequest) {
        try {
            const body = {
                paytmMid: collectRequest.pos_machine_device_id,
                paytmTid: collectRequest.pos_machine_device_code,
                transactionDateTime: new Date().toISOString(),
                merchantTransactionId: collectRequest._id,
                merchantReferenceNo: collectRequest._id,
                transactionAmount: Math.round(collectRequest.amount * 100),
                merchantExtendedInfo: {
                    PaymentMode: 'All'
                }
            };
            const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), process.env.PAYTM_MERCHANT_KEY || "n/a");
            const requestData = {
                head: {
                    requestTimeStamp: new Date().toISOString(),
                    channelId: 'RIL',
                    checksum: checksum,
                    version: '3.1'
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
                data: JSON.stringify(requestData)
            };
            const response = await axios_1.default.request(config);
            return {
                requestSent: body,
                paytmResponse: response.data,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async collectPayment(collectRequest) {
        try {
            const { requestSent, paytmResponse } = await this.initiatePOSPayment(collectRequest);
            if (paytmResponse.body.resultInfo.resultCodeId !== '0009') {
                throw new common_1.BadRequestException({ message: paytmResponse.body.resultMsg });
            }
            const deepLink = `paytmedc://paymentV2?callbackAction=${process.env.URL}/pos-paytm/callback&orderId=${collectRequest._id}&amount=${Math.round(collectRequest.amount * 100)}`;
            return ({
                message: 'Payment request sent. Ask cashier to complete payment on device.',
                deepLink,
                requestDetails: requestSent,
                paytmResponse,
            });
        }
        catch (error) {
            console.error(error);
            throw new common_1.BadRequestException({ message: 'Payment request error', error: error.message });
        }
    }
    async getTransactionStatus(orderId) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(orderId);
            if (!collectRequest) {
                throw new common_1.BadRequestException('collect request not found');
            }
            const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({ collect_id: new mongoose_1.Types.ObjectId(orderId) });
            if (!collectRequestStatus) {
                throw new common_1.BadRequestException('collect request status not found');
            }
            const body = {
                paytmMid: collectRequest.pos_machine_device_id,
                paytmTid: collectRequest.pos_machine_device_code,
                transactionDateTime: collectRequestStatus.payment_time.toISOString().slice(0, 19).replace('T', ' '),
                merchantTransactionId: orderId,
            };
            const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), process.env.PAYTM_MERCHANT_KEY || "n/a");
            const requestData = {
                head: {
                    requestTimeStamp: collectRequestStatus.payment_time.toISOString().slice(0, 19).replace('T', ' '),
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
                data: JSON.stringify(requestData)
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