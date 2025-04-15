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
exports.PayUService = void 0;
const common_1 = require("@nestjs/common");
const sign_1 = require("../utils/sign");
const qs = require("qs");
const axios_1 = require("axios");
const { unserialize } = require('php-unserialize');
const database_service_1 = require("../database/database.service");
let PayUService = class PayUService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async generate512HASH(key, txnid, amount, salt) {
        const hashString = `${key}|${txnid}|${amount}|school_fee|edviron|noreply@edviron.com|||||||||||${salt}`;
        console.log(hashString);
        const hash = await (0, sign_1.calculateSHA512Hash)(hashString);
        return hash;
    }
    async checkStatus(collect_id) {
        try {
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.BadRequestException('Order not found');
            }
            const url = 'https://info.payu.in/merchant/postservice.php?form=2';
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
            };
            const hashString = `${request.pay_u_key}|verify_payment|${collect_id}|${request.pay_u_salt}`;
            const hash = await (0, sign_1.calculateSHA512Hash)(hashString);
            console.log('debug');
            const data = qs.stringify({
                key: request.pay_u_key,
                command: 'verify_payment',
                var1: collect_id,
                hash,
            });
            const response = await axios_1.default.post(url, data, { headers });
            console.log(response.data);
            const jsonData = response.data;
            const { transaction_details } = jsonData;
            const transactionKey = collect_id;
            const transactionData = transaction_details[transactionKey];
            const { mode, status, net_amount_debit, transaction_amount, bank_ref_num, amt, addedon, } = transactionData;
            let status_code = 400;
            if (status.toUpperCase() === 'SUCCESS') {
                status_code = 200;
            }
            return {
                status: status.toUpperCase(),
                amount: Number(amt),
                transaction_amount: Number(transaction_amount),
                status_code,
                details: {
                    payment_mode: mode.toLowerCase(),
                    bank_ref: bank_ref_num,
                    payment_methods: {},
                    transaction_time: addedon,
                },
                mode,
                net_amount_debit,
                bank_ref_num,
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.PayUService = PayUService;
exports.PayUService = PayUService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], PayUService);
//# sourceMappingURL=pay-u.service.js.map