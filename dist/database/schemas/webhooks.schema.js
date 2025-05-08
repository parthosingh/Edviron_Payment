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
exports.WebhooksSchema = exports.Webhooks = exports.WebhookSource = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const collect_request_schema_1 = require("./collect_request.schema");
var WebhookSource;
(function (WebhookSource) {
    WebhookSource["Cashfree"] = "Cashfree";
    WebhookSource["Easebuzz"] = "Easebuzz";
    WebhookSource["Razorpay"] = "Razorpay";
})(WebhookSource || (exports.WebhookSource = WebhookSource = {}));
let Webhooks = class Webhooks {
};
exports.Webhooks = Webhooks;
__decorate([
    (0, mongoose_1.Prop)({
        required: false,
        type: mongoose_2.default.Schema.Types.ObjectId,
        ref: 'CollectRequest',
    }),
    __metadata("design:type", collect_request_schema_1.CollectRequest)
], Webhooks.prototype, "collect_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Webhooks.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Webhooks.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Webhooks.prototype, "webhooktype", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Webhooks.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Webhooks.prototype, "gateway", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: mongoose_2.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], Webhooks.prototype, "webhook_header", void 0);
exports.Webhooks = Webhooks = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Webhooks);
exports.WebhooksSchema = mongoose_1.SchemaFactory.createForClass(Webhooks);
//# sourceMappingURL=webhooks.schema.js.map