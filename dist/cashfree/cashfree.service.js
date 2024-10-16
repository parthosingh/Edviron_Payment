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
exports.CashfreeService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const database_service_1 = require("../database/database.service");
let CashfreeService = class CashfreeService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async initiateRefund(refund_id, amount, collect_id) {
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new Error('Collect Request not found');
        }
        console.log('initiating refund with cashfree');
        const axios = require('axios');
        const data = {
            refund_speed: 'STANDARD',
            refund_amount: amount,
            refund_id: refund_id,
        };
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/refunds`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': request.clientId || null,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
            data: data,
        };
        try {
            const response = await axios.request(config);
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async terminateOrder(collect_id) {
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new Error('Collect Request not found');
        }
        let config = {
            method: 'patch',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': request.clientId,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
            data: { order_status: 'TERMINATED' },
        };
        console.log(config);
        try {
            const response = await axios_1.default.request(config);
            return response.data;
        }
        catch (e) {
            console.log(e.message);
        }
    }
};
exports.CashfreeService = CashfreeService;
exports.CashfreeService = CashfreeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CashfreeService);
//# sourceMappingURL=cashfree.service.js.map