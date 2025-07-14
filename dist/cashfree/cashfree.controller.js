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
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const axios_1 = require("axios");
let CashfreeController = class CashfreeController {
    constructor(databaseService, cashfreeService, edvironPgService) {
        this.databaseService = databaseService;
        this.cashfreeService = cashfreeService;
        this.edvironPgService = edvironPgService;
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
        const webhook_signature = req.headers['x-webhook-signature'];
        const webhook_timestamp = req.headers['x-webhook-timestamp'];
        const raw_body = JSON.stringify(req.body);
        try {
            const signed_payload = `${webhook_timestamp}${raw_body}`;
            const generated_signature = (0, sign_1.generateHMACBase64Type)(signed_payload, process.env.CASHFREE_CLIENT_SECRET);
            if (generated_signature !== webhook_signature) {
                return res.status(400).send('Invalid webhook signature');
            }
            await this.databaseService.WebhooksModel.create({
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
            const body_data = {
                header: {
                    'x-webhook-signature': webhook_signature,
                    'x-webhook-timestamp': webhook_timestamp,
                },
                body: raw_body,
            };
            const stringified_body = JSON.stringify(body_data);
            await this.databaseService.ErrorLogsModel.create({
                type: 'Cashfree_Testing',
                body: stringified_body,
                des: error.message,
                identifier: 'Cashfree',
            });
            throw new common_1.BadRequestException(error.message);
        }
    }
    async testUpload(body) {
        try {
            return await this.cashfreeService.uploadKycDocs(body.school_id);
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async vbaWebhook(body, res) {
        await this.databaseService.WebhooksModel.create({
            body: JSON.stringify(body),
            gateway: 'CASHFREE',
            webhooktype: 'vba',
        });
        const { data } = body;
        const { order, payment, customer_details, payment_gateway_details } = data;
        const { payment_status, payment_amount, payment_message, payment_time, bank_reference, payment_method, payment_group, cf_payment_id, } = payment;
        const { utr, credit_ref_no, remitter_account, remitter_name, remitter_ifsc, email, phone, vaccount_id, vaccount_number, } = payment_method.vba_transfer;
        const { customer_name, customer_id, customer_email, customer_phone } = customer_details;
        const { gateway_name, gateway_order_id, gateway_payment_id, gateway_status_code, gateway_order_reference_id, gateway_settlement, } = payment_gateway_details;
        const request = await this.databaseService.CollectRequestModel.findOne({
            vba_account_number: vaccount_number,
        });
        if (!request) {
            return res.status(200).send('Request Not found');
        }
        request.gateway = collect_request_schema_1.Gateway.EDVIRON_PG;
        const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: request._id,
        });
        if (!collectRequestStatus) {
            return res.status(200).send('Request Not found');
        }
        if (payment_status === 'SUCCESS') {
            request.isVBAPaymentComplete = true;
            collectRequestStatus.isVBAPaymentComplete = true;
            await collectRequestStatus.save();
            await request.save();
        }
        collectRequestStatus.transaction_amount = payment_amount;
        collectRequestStatus.payment_method = 'vba';
        collectRequestStatus.status = payment_status;
        collectRequestStatus.details = JSON.stringify(payment_method.vba_transfer);
        collectRequestStatus.bank_reference = bank_reference;
        collectRequestStatus.payment_time = new Date(payment_time);
        collectRequestStatus.payment_message = payment_message;
        if (cf_payment_id) {
            collectRequestStatus.cf_payment_id = cf_payment_id;
        }
        await collectRequestStatus.save();
        try {
            const axios = require('axios');
            const tokenData = {
                school_id: request.school_id,
                trustee_id: request.trustee_id,
                order_amount: collectRequestStatus.order_amount,
                transaction_amount: payment_amount,
                platform_type: 'vba',
                payment_mode: 'Others',
                collect_id: request._id.toString(),
            };
            const _jwt = jwt.sign(tokenData, process.env.KEY, {
                noTimestamp: true,
            });
            let data = JSON.stringify({
                token: _jwt,
                school_id: request.school_id,
                trustee_id: request.trustee_id,
                order_amount: collectRequestStatus.order_amount,
                transaction_amount: payment_amount,
                platform_type: 'vba',
                payment_mode: 'Others',
                collect_id: request._id,
            });
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/add-commission`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                },
                data: data,
            };
            try {
                const { data: commissionRes } = await axios.request(config);
                console.log('Commission calculation response:', commissionRes);
            }
            catch (error) {
                console.error('Error calculating commission:', error.message);
            }
        }
        catch (e) { }
        const webHookUrl = request.req_webhook_urls;
        const webHookDataInfo = {
            collect_id: request._id.toString(),
            amount: request.amount,
            status: payment_status,
            trustee_id: request.trustee_id,
            school_id: request.school_id,
            req_webhook_urls: request.req_webhook_urls,
            custom_order_id: request.custom_order_id || null,
            createdAt: collectRequestStatus?.createdAt,
            transaction_time: payment_time,
            additional_data: request.additional_data,
            details: collectRequestStatus.details,
            transaction_amount: collectRequestStatus.transaction_amount,
            bank_reference: collectRequestStatus.bank_reference,
            payment_method: collectRequestStatus.payment_method,
            payment_details: collectRequestStatus.details,
            formattedDate: `${collectRequestStatus.payment_time.getFullYear()}-${String(collectRequestStatus.payment_time.getMonth() + 1).padStart(2, '0')}-${String(collectRequestStatus.payment_time.getDate()).padStart(2, '0')}`,
        };
        if (webHookUrl !== null) {
            console.log('calling webhook');
            let webhook_key = null;
            try {
                const token = jwt.sign({ trustee_id: request.trustee_id.toString() }, process.env.KEY);
                const config = {
                    method: 'get',
                    maxBodyLength: Infinity,
                    url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-webhook-key?token=${token}&trustee_id=${request.trustee_id.toString()}`,
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                    },
                };
                const { data } = await axios_1.default.request(config);
                webhook_key = data?.webhook_key;
            }
            catch (error) {
                console.error('Error getting webhook key:', error.message);
            }
            if (request?.trustee_id.toString() === '66505181ca3e97e19f142075') {
                console.log('Webhook called for webschool');
                setTimeout(async () => {
                    try {
                        await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo, webhook_key);
                    }
                    catch (e) {
                        console.log(`Error sending webhook to ${webHookUrl}:`, e.message);
                    }
                }, 60000);
            }
            else {
                console.log('Webhook called for other schools');
                console.log(webHookDataInfo);
                try {
                    await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo, webhook_key);
                }
                catch (e) {
                    console.log(`Error sending webhook to ${webHookUrl}:`, e.message);
                }
            }
        }
        res.status(200).send('OK');
    }
    async createVBA(body) {
        const { cf_x_clien_secret, cf_x_client_id, school_id, token, virtual_account_details, notification_group, } = body;
        try {
            const decodedToken = (await jwt.verify(token, process.env.KEY));
            if (decodedToken.school_id !== school_id) {
                throw new common_1.UnauthorizedException('Invalid Token');
            }
            return await this.cashfreeService.createVBA(cf_x_client_id, cf_x_clien_secret, virtual_account_details, notification_group);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async createVBAV2(body) {
        const { cf_x_clien_secret, cf_x_client_id, school_id, token, virtual_account_details, notification_group, amount, } = body;
        try {
            const decodedToken = (await jwt.verify(token, process.env.KEY));
            if (decodedToken.school_id !== school_id) {
                throw new common_1.UnauthorizedException('Invalid Token');
            }
            return await this.cashfreeService.createVBAV2(cf_x_client_id, cf_x_clien_secret, virtual_account_details, notification_group, amount);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async uploadKYC(body) {
        try {
            return await this.cashfreeService.uploadKycDocs(body.school_id);
        }
        catch (e) {
            console.log(e);
        }
    }
    async redirect(session_id, res) {
        try {
            const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting to Payment...</title>
          <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
      </head>
      <body>
          <p>Redirecting to payment page...</p>
          <script>
              const cashfree = Cashfree({ mode: "production" });
              const checkoutOptions = {
                  paymentSessionId: "${session_id}",
                  redirectTarget: "_self"
              };
              cashfree.checkout(checkoutOptions);
          </script>
      </body>
      </html>
    `;
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (e) {
            console.error(e);
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
__decorate([
    (0, common_1.Post)('upload-kyc'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "testUpload", null);
__decorate([
    (0, common_1.Post)('/webhook/vba-transaction'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "vbaWebhook", null);
__decorate([
    (0, common_1.Post)('create-vba'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "createVBA", null);
__decorate([
    (0, common_1.Post)('v2/create-vba'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "createVBAV2", null);
__decorate([
    (0, common_1.Post)('/upload-kyc-docs'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "uploadKYC", null);
__decorate([
    (0, common_1.Get)('/redirect'),
    __param(0, (0, common_1.Query)('session_id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CashfreeController.prototype, "redirect", null);
exports.CashfreeController = CashfreeController = __decorate([
    (0, common_1.Controller)('cashfree'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        cashfree_service_1.CashfreeService,
        edviron_pg_service_1.EdvironPgService])
], CashfreeController);
const u = {
    data: { test_object: { test_key: 'test_value' } },
    type: 'WEBHOOK',
    event_time: '2025-05-20T10:24:38.589Z',
};
//# sourceMappingURL=cashfree.controller.js.map