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
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const sign_1 = require("../utils/sign");
const webhooks_schema_1 = require("../database/schemas/webhooks.schema");
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
    async initiateSplitRefund(body) {
        const { token, refund_amount, refund_note, collect_id, refund_id, refund_splits, } = body;
        const data = {
            refund_amount: refund_amount,
            refund_id: refund_id,
            refund_note: refund_note,
            refund_splits,
            refund_speed: 'STANDARD',
        };
        try {
            let decrypted = jwt.verify(token, process.env.KEY);
            if (decrypted.collect_id != collect_id) {
                throw new common_1.BadRequestException('Invalid token');
            }
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.BadRequestException('Collect Request not found');
            }
            const config = {
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
            const axios = require('axios');
            const response = await axios.request(config);
            return response.data;
        }
        catch (e) {
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
        if (request.gateway === collect_request_schema_1.Gateway.EXPIRED) {
            throw new common_1.BadRequestException('Payment Expired');
        }
        request.gateway = collect_request_schema_1.Gateway.EDVIRON_PG;
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
            request.isQRPayment = true;
            await request.save();
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
                if (e.response?.data?.message &&
                    e.response?.data?.code === 'order_inactive') {
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
            console.log(limit, 'limit');
            return await this.cashfreeService.getTransactionForSettlements(utr, client_id, limit, body.cursor);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async testWebhook(req, res) {
        try {
            console.log('test webhook called');
            return res.status(200).json({ message: 'Webhook test successful' });
        }
        catch (e) {
            console.log(e);
        }
    }
    async testWebhook2(req, res) {
        try {
            console.log('test webhook called');
            return res.status(200).json({ message: 'Webhook test successful' });
        }
        catch (e) {
            console.log(e);
        }
    }
    async checkStatus(req) {
        const collect_id = req.query.collect_id;
        const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectReq) {
            throw new common_1.BadRequestException('Error while');
        }
        return this.cashfreeService.getPaymentStatus(collect_id, collectReq.clientId);
    }
    async disputeEvidence(body) {
        try {
            const { dispute_id, documents, action, client_id, sign } = body;
            const decodedToken = jwt.verify(sign, process.env.KEY);
            if (!decodedToken)
                throw new common_1.BadRequestException('Request Forged');
            if (decodedToken.action !== action ||
                decodedToken.client_id !== client_id ||
                decodedToken.dispute_id !== dispute_id)
                throw new common_1.BadRequestException('Request Forged');
            if (action === 'deny') {
                return this.cashfreeService.submitDisputeEvidence(dispute_id, documents, client_id);
            }
            else {
                return this.cashfreeService.acceptDispute(dispute_id, client_id);
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message || 'Something went wrong');
        }
    }
    async testSecureWebhook(req, res) {
        try {
            const webhook_signature = req.headers['x-webhook-signature'];
            const webhook_timestamp = req.headers['x-webhook-timestamp'];
            const raw_body = JSON.stringify(req.body);
            const signed_payload = `${webhook_timestamp}${raw_body}`;
            const generated_signature = (0, sign_1.generateHMACBase64Type)(signed_payload, process.env.CASHFREE_CLIENT_SECRET);
            if (generated_signature !== webhook_signature) {
                return res.status(400).send('Invalid webhook signature');
            }
            this.databaseService.WebhooksModel.create({
                body: raw_body,
                webhook_header: {
                    source: webhooks_schema_1.WebhookSource.Cashfree,
                    headers: {
                        'x-webhook-signature': webhook_signature,
                        'x-webhook-timestamp': webhook_timestamp,
                    },
                },
            });
            return res.status(200).json({ message: 'Webhook test successful' });
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
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
    (0, common_1.Post)('/split-refund'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "initiateSplitRefund", null);
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
__decorate([
    (0, common_1.Post)('/webhook-test'),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "testWebhook", null);
__decorate([
    (0, common_1.Post)('/webhook-test-2'),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "testWebhook2", null);
__decorate([
    (0, common_1.Get)('/status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "checkStatus", null);
__decorate([
    (0, common_1.Post)('/update-dispute'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "disputeEvidence", null);
__decorate([
    (0, common_1.Post)('/webhook/secure-test'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "testSecureWebhook", null);
exports.CashfreeController = CashfreeController = __decorate([
    (0, common_1.Controller)('cashfree'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        cashfree_service_1.CashfreeService])
], CashfreeController);
//# sourceMappingURL=cashfree.controller.js.map