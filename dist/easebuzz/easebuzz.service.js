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
const sign_1 = require("../utils/sign");
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
};
exports.EasebuzzService = EasebuzzService;
exports.EasebuzzService = EasebuzzService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EasebuzzService);
//# sourceMappingURL=easebuzz.service.js.map