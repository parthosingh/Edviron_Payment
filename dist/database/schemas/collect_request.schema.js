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
exports.CollectRequestSchema = exports.CollectRequest = exports.Gateway = void 0;
const mongoose_1 = require("@nestjs/mongoose");
var Gateway;
(function (Gateway) {
    Gateway["PHONEPE"] = "PHONEPE";
    Gateway["HDFC"] = "HDFC";
    Gateway["EDVIRON_PG"] = "EDVIRON_PG";
})(Gateway || (exports.Gateway = Gateway = {}));
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
    (0, mongoose_1.Prop)({ required: false, unique: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "custom_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "req_webhook_urls", void 0);
exports.CollectRequest = CollectRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CollectRequest);
exports.CollectRequestSchema = mongoose_1.SchemaFactory.createForClass(CollectRequest);
//# sourceMappingURL=collect_request.schema.js.map