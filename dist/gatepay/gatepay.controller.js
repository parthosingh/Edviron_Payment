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
exports.GatepayController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const database_service_1 = require("../database/database.service");
const gatepay_service_1 = require("./gatepay.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
let GatepayController = class GatepayController {
    constructor(databaseService, gatepayService) {
        this.databaseService = databaseService;
        this.gatepayService = gatepayService;
    }
    async handleCallback(req, res) {
        try {
            const { collect_id } = req.query;
            const { status, message, response, terminalId } = req.body;
            const [collect_request, collect_req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!collect_request || !collect_req_status) {
                throw new common_1.BadRequestException('Request not found');
            }
            const { gatepay_key, gatepay_iv } = collect_request.gatepay;
            const decrypted = await this.gatepayService.decryptEas(response, gatepay_key, gatepay_iv);
            const parseData = JSON.parse(JSON.parse(decrypted));
            console.log('Decrypted Response:', JSON.stringify(parseData, null, 2));
            const { paymentMode, txnStatus, txnAmount, txnDate, getepayTxnId } = parseData;
            try {
                await this.databaseService.WebhooksModel.create({
                    body: JSON.stringify(parseData),
                    gateway: 'gatepay_callback',
                });
            }
            catch (error) {
                console.error('Webhook save failed:', error.message);
            }
            let paymentMethod = '';
            switch (paymentMode) {
                case 'DC':
                    paymentMethod = 'debitCard';
                    break;
                case 'CC':
                    paymentMethod = 'creditCard';
                    break;
                case 'NB':
                    paymentMethod = 'netBanking';
                    break;
                case 'UPI':
                    paymentMethod = 'upi';
                    break;
            }
            const formattedDate = txnDate?.replace(' ', 'T');
            const dateObj = formattedDate ? new Date(formattedDate) : null;
            if (!dateObj || isNaN(dateObj.getTime())) {
                throw new common_1.BadRequestException('Invalid txnDate received');
            }
            collect_req_status.status =
                txnStatus === 'SUCCESS' ? collect_req_status_schema_1.PaymentStatus.SUCCESS : collect_req_status_schema_1.PaymentStatus.PENDING;
            collect_req_status.transaction_amount = txnAmount || '';
            collect_req_status.payment_time = dateObj || Date.now();
            collect_req_status.payment_method = paymentMethod || '';
            collect_req_status.payment_message = message || '';
            await collect_req_status.save();
            const payment_status = collect_req_status.status;
            if (collect_request.sdkPayment) {
                const redirectBase = process.env.PG_FRONTEND;
                const route = payment_status === collect_req_status_schema_1.PaymentStatus.SUCCESS
                    ? 'payment-success'
                    : 'payment-failure';
                return res.redirect(`${redirectBase}/${route}?collect_id=${collect_id}`);
            }
            const callbackUrl = new URL(collect_request.callbackUrl);
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
            if (payment_status !== collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                callbackUrl.searchParams.set('status', 'FAILED');
                callbackUrl.searchParams.set('reason', 'Payment-failed');
                return res.redirect(callbackUrl.toString());
            }
            callbackUrl.searchParams.set('status', 'SUCCESS');
            return res.redirect(callbackUrl.toString());
        }
        catch (error) {
            console.error('Callback Error:', error);
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
};
exports.GatepayController = GatepayController;
__decorate([
    (0, common_1.Post)('callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatepayController.prototype, "handleCallback", null);
exports.GatepayController = GatepayController = __decorate([
    (0, common_1.Controller)('gatepay'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        gatepay_service_1.GatepayService])
], GatepayController);
//# sourceMappingURL=gatepay.controller.js.map