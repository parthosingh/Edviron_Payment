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
exports.HdfcRazorpayController = void 0;
const common_1 = require("@nestjs/common");
const hdfc_razorpay_service_1 = require("./hdfc_razorpay.service");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const mongoose_1 = require("mongoose");
let HdfcRazorpayController = class HdfcRazorpayController {
    constructor(hdfcRazorpayService, databaseService) {
        this.hdfcRazorpayService = hdfcRazorpayService;
        this.databaseService = databaseService;
    }
    async handleCallback(body, collect_id, res) {
        try {
            const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, } = body;
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest)
                throw new common_1.BadRequestException('Order Id not found');
            const isValid = this.hdfcRazorpayService.verifySignature(orderId, paymentId, signature, collectRequest.hdfc_razorpay_secret);
            if (!isValid)
                throw new common_1.BadRequestException('Invalid Signature');
            collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_HDFC_RAZORPAY;
            collectRequest.hdfc_razorpay_order_id = orderId;
            collectRequest.hdfc_razorpay_payment_id = paymentId;
            await collectRequest.save();
            const paymentStatus = await this.hdfcRazorpayService.checkPaymentStatus(paymentId, collectRequest);
            if (collectRequest.sdkPayment) {
                if (paymentStatus.status === 'SUCCESS') {
                    return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collectRequest._id}`);
                }
                return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collectRequest._id}`);
            }
            const callbackUrl = new URL(collectRequest?.callbackUrl);
            if (paymentStatus.status !== `SUCCESS`) {
                callbackUrl.searchParams.set('EdvironCollectRequestId', collectRequest._id.toString());
                callbackUrl.searchParams.set('status', paymentStatus.status);
                return res.redirect(callbackUrl.toString());
            }
            callbackUrl.searchParams.set('EdvironCollectRequestId', collectRequest._id.toString());
            callbackUrl.searchParams.set('status', paymentStatus.status);
            return res.redirect(callbackUrl.toString());
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async handleRedirectPaymentPage(collect_id, order_id, school_name, res) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest)
                throw new common_1.BadRequestException('Order Id not found');
            const amount = (collectRequest.amount * 100).toString();
            const callback_url = new URL(`${collectRequest.callbackUrl}?collect_id=${collect_id}`).toString();
            const formatted_school_name = school_name.split('_').join(' ');
            res.send(`
    <form method="POST" name="redirect" action="https://api.razorpay.com/v1/checkout/embedded">
      <input type="hidden" name="key_id" value="${collectRequest.hdfc_razorpay_id}" />
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="currency" value="INR" />
      <input type="hidden" name="order_id" value="${order_id}" />
      <input type="hidden" name="name" value="${formatted_school_name}" />
      <input type="hidden" name="prefill[contact]" value="9090909090" />
      <input
        type="hidden"
        name="prefill[email]"
        value="testing@email.com"
      />
      <input
        type="hidden"
        name="image"
        value="https://cdn.razorpay.com/logos/BUVwvgaqVByGp2_large.jpg"
      />
      <input
        type="hidden"
        name="callback_url"
        value="${process.env.URL}/hdfc-razorpay/callback/${collect_id}"
      />
      <input
        type="hidden"
        name="cancel_url"
        value="${callback_url}"
      />
    </form>
     <script type="text/javascript">
        window.onload = function(){
            document.forms['redirect'].submit();
        }
    </script>
        `);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async webhook(body, res) {
        const details = JSON.stringify(body);
        const webhook = await new this.databaseService.WebhooksModel({
            body: details,
            gateway: collect_request_schema_1.Gateway.EDVIRON_HDFC_RAZORPAY,
        }).save();
        const { payload } = body;
        const { order_id, amount, method, bank, acquirer_data, error_reason, card, card_id, wallet } = payload.payment.entity;
        let { status } = payload.payment.entity;
        const { created_at } = payload.payment.entity;
        const { receipt } = payload.order.entity;
        try {
            const collect_id = receipt;
            try {
                const webhook = await new this.databaseService.WebhooksModel({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                    body: details,
                    gateway: collect_request_schema_1.Gateway.EDVIRON_HDFC_RAZORPAY,
                }).save();
            }
            catch (e) {
                await new this.databaseService.WebhooksModel({
                    body: details,
                    gateway: collect_request_schema_1.Gateway.EDVIRON_HDFC_RAZORPAY,
                }).save();
            }
            const collectIdObject = new mongoose_1.Types.ObjectId(collect_id);
            const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
            if (!collectReq)
                throw new Error('Collect request not found');
            const transaction_amount = amount / 100 || null;
            let payment_method = method || null;
            if (payment_method === 'netbanking') {
                payment_method = 'net_banking';
            }
            let detail;
            switch (payment_method) {
                case 'upi':
                    detail = {
                        upi: {
                            channel: null,
                            upi_id: payload.payment.entity.vpa || null,
                        }
                    };
                    break;
                case 'card':
                    detail = {
                        card: {
                            card_bank_name: card.type || null,
                            card_country: card.international === false ? "IN" : card.international === true ? "OI" : null,
                            card_network: card.network || null,
                            card_number: card_id || null,
                            card_sub_type: card.sub_type || null,
                            card_type: card.type || null,
                            channel: null
                        }
                    };
                    break;
                case 'netbanking':
                    detail = {
                        netbanking: {
                            channel: null,
                            netbanking_bank_code: acquirer_data.bank_transaction_id,
                            netbanking_bank_name: bank,
                        }
                    };
                    break;
                case 'wallet':
                    detail = {
                        wallet: {
                            channel: wallet,
                            provider: wallet
                        }
                    };
                    break;
                default:
                    detail = {};
            }
            const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            if (pendingCollectReq &&
                pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
                res.status(200).send('OK');
                return;
            }
            if (status.toLowerCase() == 'captured') {
                status = 'SUCCESS';
            }
            const orderPaymentDetail = {
                bank: bank,
                transaction_id: acquirer_data.bank_transaction_id,
                method: method,
            };
            const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                collect_id: collectIdObject,
            }, {
                $set: {
                    status: status,
                    payment_time: new Date(created_at * 1000),
                    transaction_amount,
                    payment_method,
                    details: JSON.stringify(detail),
                    bank_reference: acquirer_data.bank_transaction_id,
                    reason: error_reason,
                    payment_message: error_reason,
                },
            }, {
                upsert: true,
                new: true,
            });
            res.status(200).send('OK');
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.HdfcRazorpayController = HdfcRazorpayController;
__decorate([
    (0, common_1.Post)('/callback/:collect_id'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('collect_id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], HdfcRazorpayController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('/redirect'),
    __param(0, (0, common_1.Query)('collect_id')),
    __param(1, (0, common_1.Query)('order_id')),
    __param(2, (0, common_1.Query)('school_name')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], HdfcRazorpayController.prototype, "handleRedirectPaymentPage", null);
__decorate([
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HdfcRazorpayController.prototype, "webhook", null);
exports.HdfcRazorpayController = HdfcRazorpayController = __decorate([
    (0, common_1.Controller)('hdfc-razorpay'),
    __metadata("design:paramtypes", [hdfc_razorpay_service_1.HdfcRazorpayService,
        database_service_1.DatabaseService])
], HdfcRazorpayController);
//# sourceMappingURL=hdfc_razorpay.controller.js.map