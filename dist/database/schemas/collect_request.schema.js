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
exports.CollectRequestSchema = exports.CollectRequest = exports.paytmPos = exports.PaymentIds = exports.Gateway = void 0;
const mongoose_1 = require("@nestjs/mongoose");
var Gateway;
(function (Gateway) {
    Gateway["PHONEPE"] = "PHONEPE";
    Gateway["HDFC"] = "HDFC";
    Gateway["EDVIRON_PG"] = "EDVIRON_PG";
    Gateway["EDVIRON_PAY_U"] = "EDVIRON_PAY_U";
    Gateway["EDVIRON_CCAVENUE"] = "EDVIRON_CCAVENUE";
    Gateway["EDVIRON_CASHFREE"] = "EDVIRON_CASHFREE";
    Gateway["EDVIRON_EASEBUZZ"] = "EDVIRON_EASEBUZZ";
    Gateway["PENDING"] = "PENDING";
    Gateway["EXPIRED"] = "EXPIRED";
    Gateway["EDVIRON_HDFC_RAZORPAY"] = "EDVIRON_HDFC_RAZORPAY";
    Gateway["SMART_GATEWAY"] = "EDVIRON_SMARTGATEWAY";
    Gateway["PAYTM_POS"] = "PAYTM_POS";
    Gateway["MOSAMBEE_POS"] = "MOSAMBEE_POS";
    Gateway["EDVIRON_NTTDATA"] = "EDVIRON_NTTDATA";
    Gateway["EDVIRON_WORLDLINE"] = "EDVIRON_WORLDLINE";
})(Gateway || (exports.Gateway = Gateway = {}));
let PaymentIds = class PaymentIds {
};
exports.PaymentIds = PaymentIds;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "cashfree_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "easebuzz_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "easebuzz_upi_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "easebuzz_cc_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "easebuzz_dc_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "ccavenue_id", void 0);
exports.PaymentIds = PaymentIds = __decorate([
    (0, mongoose_1.Schema)()
], PaymentIds);
let paytmPos = class paytmPos {
};
exports.paytmPos = paytmPos;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "paytmMid", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "paytmTid", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "channel_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "paytm_merchant_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "device_id", void 0);
exports.paytmPos = paytmPos = __decorate([
    (0, mongoose_1.Schema)()
], paytmPos);
let CollectRequest = class CollectRequest {
};
exports.CollectRequest = CollectRequest;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CollectRequest.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CollectRequest.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CollectRequest.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "callbackUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: Gateway.PHONEPE }),
    __metadata("design:type", String)
], CollectRequest.prototype, "gateway", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "clientId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "easebuzz_sub_merchant_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "clientSecret", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "webHookUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: [] }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "disabled_modes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: '' }),
    __metadata("design:type", String)
], CollectRequest.prototype, "additional_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "payment_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "sdkPayment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isVBAPayment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isVBAPaymentComplete", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, unique: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "custom_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "req_webhook_urls", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "ccavenue_merchant_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "ccavenue_access_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "ccavenue_working_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "smartgateway_merchant_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "smartgateway_customer_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "smart_gateway_api_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "deepLink", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: PaymentIds, required: false }),
    __metadata("design:type", PaymentIds)
], CollectRequest.prototype, "paymentIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "vendors_info", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "easebuzzVendors", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "cashfreeVedors", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "worldline_vendors_info", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_secret", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_payment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_mid", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isSplitPayments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isQRPayment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pay_u_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pay_u_salt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "easebuzz_split_label", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pos_machine_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pos_machine_device_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pos_machine_device_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isPosTransaction", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: paytmPos, required: false }),
    __metadata("design:type", paytmPos)
], CollectRequest.prototype, "paytmPos", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: false,
        type: {
            nttdata_id: { type: String, required: false, default: null },
            nttdata_secret: { type: String, required: false, default: null },
            ntt_atom_token: { type: String, required: false, default: null },
            ntt_atom_txn_id: { type: String, required: false, default: null },
            nttdata_hash_req_key: { type: String, required: false, default: null },
            nttdata_req_salt: { type: String, required: false, default: null },
            nttdata_hash_res_key: { type: String, required: false, default: null },
            nttdata_res_salt: { type: String, required: false, default: null },
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], CollectRequest.prototype, "ntt_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: false,
        type: {
            worldline_merchant_id: { type: String, required: false, default: null },
            worldline_encryption_key: {
                type: String,
                required: false,
                default: null,
            },
            worldline_encryption_iV: { type: String, required: false, default: null },
            worldline_token: { type: String, required: false, default: null },
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], CollectRequest.prototype, "worldline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "worldline_token", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "vba_account_number", void 0);
exports.CollectRequest = CollectRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CollectRequest);
exports.CollectRequestSchema = mongoose_1.SchemaFactory.createForClass(CollectRequest);
//# sourceMappingURL=collect_request.schema.js.map