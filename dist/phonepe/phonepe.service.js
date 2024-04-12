"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhonepeService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const crypto = require("crypto");
const transactionStatus_1 = require("../types/transactionStatus");
function encodeBase64(str) {
    const string = String(str);
    const buffer = Buffer.from(string);
    const base64 = buffer.toString('base64');
    return base64;
}
function sha256(str) {
    const string = String(str);
    const hash = crypto.createHash('sha256');
    hash.update(string);
    const digest = hash.digest('hex');
    return digest;
}
function generateXVerify(apiEndpoint, encodedRequest) {
    return (sha256(encodedRequest + apiEndpoint + process.env.PHONEPE_SALT) +
        '###' +
        process.env.PHONEPE_SALT_INDEX);
}
let PhonepeService = class PhonepeService {
    async collect(request) {
        const apiEndpoint = '/pg/v1/pay';
        const payAPIRequest = {
            merchantId: 'EDVIRONONLINE',
            merchantTransactionId: request._id,
            merchantUserId: 'user_' + request._id,
            amount: request.amount * 100,
            redirectUrl: process.env.URL + '/phonepe/redirect',
            redirectMode: 'POST',
            callbackUrl: process.env.URL + '/phonepe/callback',
            mobileNumber: '9999999999',
            paymentInstrument: {
                type: 'PAY_PAGE',
            },
        };
        const encodedRequest = encodeBase64(JSON.stringify(payAPIRequest));
        const xVerify = generateXVerify(apiEndpoint, encodedRequest);
        let data = JSON.stringify({
            request: encodedRequest,
        });
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://api.phonepe.com/apis/hermes/pg/v1/pay',
            headers: {
                'Content-Type': 'application/json',
                accept: 'application/json',
                'X-VERIFY': xVerify,
            },
            data: data,
        };
        const res = await axios_1.default.request(config);
        return {
            url: res.data.data.instrumentResponse.redirectInfo.url,
        };
    }
    async checkStatus(transactionId) {
        const apiEndpoint = '/pg/v1/pay';
        const xVerify = sha256('/pg/v1/status/EDVIRONONLINE/' +
            transactionId +
            process.env.PHONEPE_SALT) +
            '###' +
            process.env.PHONEPE_SALT_INDEX;
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.phonepe.com/apis/hermes/pg/v1/status/EDVIRONONLINE/' +
                transactionId,
            headers: {
                'Content-Type': 'application/json',
                accept: 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': 'EDVIRONONLINE',
            },
        };
        const res = await axios_1.default.request(config);
        const is_completed = res.data.data.state === 'COMPLETED';
        const is_pending = res.data.data.state === 'PENDING';
        const txStatus = is_completed
            ? transactionStatus_1.TransactionStatus.SUCCESS
            : is_pending
                ? transactionStatus_1.TransactionStatus.PENDING
                : transactionStatus_1.TransactionStatus.FAILURE;
        return { status: txStatus, amount: res.data.data.amount / 100 };
    }
};
exports.PhonepeService = PhonepeService;
exports.PhonepeService = PhonepeService = __decorate([
    (0, common_1.Injectable)()
], PhonepeService);
//# sourceMappingURL=phonepe.service.js.map