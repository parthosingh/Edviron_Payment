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
exports.GatepayService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const crypto = require('crypto');
let GatepayService = class GatepayService {
    constructor() { }
    async encryptEas(data, keyBase64, ivBase64) {
        const key = Buffer.from(keyBase64, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted.toUpperCase();
    }
    async createOrder(request) {
        const { _id, amount, gatepay } = request;
        try {
            const { gatepay_mid, gatepay_key, gatepay_iv, gatepay_terminal_id, udf1, udf2, udf3, } = gatepay;
            const formatDate = (date) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const months = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                ];
                const pad = (n) => n.toString().padStart(2, '0');
                const day = days[date.getDay()];
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                const hours = pad(date.getHours());
                const minutes = pad(date.getMinutes());
                const seconds = pad(date.getSeconds());
                return `${day} ${month} ${pad(date.getDate())} ${hours}:${minutes}:${seconds} IST ${year}`;
            };
            const formatedDate = formatDate(new Date());
            console.log(formatedDate, "formatedDate");
            const data = {
                mid: gatepay_mid,
                amount: amount.toFixed(2).toString(),
                merchantTransactionId: request._id.toString(),
                transactionDate: formatedDate,
                terminalId: gatepay_terminal_id,
                udf1: udf1,
                udf2: `mailto:${udf2}`,
                udf3: udf3,
                udf4: '',
                udf5: '',
                udf6: '',
                udf7: '',
                udf8: '',
                udf9: '',
                udf10: '',
                ru: `${process.env.URL}/gatepay/callback?collect_id=${_id}`,
                callbackUrl: `${process.env.URL}/gatepay/callback?collect_id=${_id}`,
                currency: 'INR',
                paymentMode: 'ALL',
                bankId: '',
                txnType: 'single',
                productType: 'IPG',
                txnNote: 'Test Txn',
                vpa: gatepay_terminal_id,
            };
            const ciphertext = await this.encryptEas(JSON.stringify(data), gatepay_key, gatepay_iv);
            console.log(ciphertext, 'ciphertext');
            const raw = {
                mid: gatepay_mid,
                terminalId: gatepay_terminal_id,
                req: ciphertext,
            };
            const config = {
                url: 'https://pay1.getepay.in:8443/getepayPortal/pg/generateInvoice',
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: raw,
                redirect: 'follow',
            };
            const axiosRequest = axios_1.default.request(config);
            console.log(axiosRequest, 'request');
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
        return { url: 'url,', collect_req: request };
    }
};
exports.GatepayService = GatepayService;
exports.GatepayService = GatepayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GatepayService);
//# sourceMappingURL=gatepay.service.js.map