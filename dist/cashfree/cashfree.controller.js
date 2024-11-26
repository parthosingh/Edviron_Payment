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
const jwt = require("jsonwebtoken");
const cashfree_service_1 = require("./cashfree.service");
let CashfreeController = class CashfreeController {
    constructor(databaseService, cashfreeService) {
        this.databaseService = databaseService;
        this.cashfreeService = cashfreeService;
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
    async getUpiPaymentInfoUrl(req) {
        const { token, collect_id } = req.query;
        let decrypted = jwt.verify(token, process.env.KEY);
        if (decrypted.collect_id != collect_id) {
            throw new common_1.BadRequestException('Invalid token');
        }
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new common_1.BadRequestException('Collect Request not found');
        }
        await request.save();
        const cashfreeId = request.paymentIds.cashfree_id;
        if (!cashfreeId) {
            throw new common_1.BadRequestException('Error in Getting QR Code');
        }
        let intentData = JSON.stringify({
            payment_method: {
                upi: {
                    channel: 'link',
                },
            },
            payment_session_id: cashfreeId,
        });
        let qrCodeData = JSON.stringify({
            payment_method: {
                upi: {
                    channel: 'qrcode',
                },
            },
            payment_session_id: cashfreeId,
        });
        let upiConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/sessions`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
            },
            data: intentData,
        };
        let qrCodeConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/sessions`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
            },
            data: qrCodeData,
        };
        const axios = require('axios');
        try {
            const { data: upiIntent } = await axios.request(upiConfig);
            const { data: qrCode } = await axios.request(qrCodeConfig);
            const intent = upiIntent.data.payload.default;
            const qrCodeUrl = qrCode.data.payload.qrcode;
            const qrBase64 = qrCodeUrl.split(',')[1];
            setTimeout(async () => {
                try {
                    await this.cashfreeService.terminateOrder(collect_id);
                    console.log(`Order ${collect_id} terminated after 10 minutes`);
                }
                catch (error) {
                    console.error(`Failed to terminate order ${collect_id}:`, error);
                }
            }, 600000);
            return { intentUrl: intent, qrCodeBase64: qrBase64, collect_id };
        }
        catch (e) {
            console.log(e);
            if (e.response?.data?.message && e.response?.data?.code) {
                if (e.response?.data?.message && e.response?.data?.code === 'order_inactive') {
                    throw new common_1.BadRequestException('Order expired');
                }
                throw new common_1.BadRequestException(e.response.data.message);
            }
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getSettlementsTransactions(body, req) {
        const { utr, client_id, token } = req.query;
        try {
            const limit = body.limit || 40;
            return await this.cashfreeService.getTransactionForSettlements(utr, client_id, limit, body.cursor);
        }
        catch (e) {
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
__decorate([
    (0, common_1.Get)('/upi-payment'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "getUpiPaymentInfoUrl", null);
__decorate([
    (0, common_1.Post)('/settlements-transactions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "getSettlementsTransactions", null);
exports.CashfreeController = CashfreeController = __decorate([
    (0, common_1.Controller)('cashfree'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        cashfree_service_1.CashfreeService])
], CashfreeController);
//# sourceMappingURL=cashfree.controller.js.map