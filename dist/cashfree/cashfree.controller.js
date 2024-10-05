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
exports.CashfreeController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let CashfreeController = class CashfreeController {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async initiateRefund(body) {
        const { collect_id, amount, refund_id } = body;
        console.log(body);
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new Error('Collect Request not found');
        }
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
            console.log(response);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.CashfreeController = CashfreeController;
__decorate([
    (0, common_1.Post)('/refund'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "initiateRefund", null);
exports.CashfreeController = CashfreeController = __decorate([
    (0, common_1.Controller)('cashfree'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CashfreeController);
//# sourceMappingURL=cashfree.controller.js.map