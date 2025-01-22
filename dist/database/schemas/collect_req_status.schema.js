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
exports.CollectRequestStatusSchema = exports.CollectRequestStatus = exports.PaymentStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const collect_request_schema_1 = require("./collect_request.schema");
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAIL"] = "FAIL";
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["EXPIRED"] = "EXPIRED";
    PaymentStatus["FAILURE"] = "FAILURE";
    PaymentStatus["AUTO_REFUND"] = "AUTO_REFUND";
    PaymentStatus["USER_DROPPED"] = "USER_DROPPED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
let CollectRequestStatus = class CollectRequestStatus {
};
exports.CollectRequestStatus = CollectRequestStatus;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CollectRequestStatus.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CollectRequestStatus.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        ref: 'CollectRequest',
        type: mongoose_2.default.Schema.Types.ObjectId,
    }),
    __metadata("design:type", collect_request_schema_1.CollectRequest)
], CollectRequestStatus.prototype, "collect_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CollectRequestStatus.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CollectRequestStatus.prototype, "order_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CollectRequestStatus.prototype, "transaction_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: '' }),
    __metadata("design:type", String)
], CollectRequestStatus.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: '' }),
    __metadata("design:type", String)
], CollectRequestStatus.prototype, "details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: '' }),
    __metadata("design:type", String)
], CollectRequestStatus.prototype, "status_details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: '' }),
    __metadata("design:type", String)
], CollectRequestStatus.prototype, "bank_reference", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: '' }),
    __metadata("design:type", Date)
], CollectRequestStatus.prototype, "payment_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequestStatus.prototype, "isAttempted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequestStatus.prototype, "isAutoRefund", void 0);
exports.CollectRequestStatus = CollectRequestStatus = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CollectRequestStatus);
exports.CollectRequestStatusSchema = mongoose_1.SchemaFactory.createForClass(CollectRequestStatus);
//# sourceMappingURL=collect_req_status.schema.js.map