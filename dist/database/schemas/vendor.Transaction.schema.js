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
exports.VendorTransactionSchema = exports.VendorTransaction = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const collect_request_schema_1 = require("./collect_request.schema");
let VendorTransaction = class VendorTransaction {
};
exports.VendorTransaction = VendorTransaction;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], VendorTransaction.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], VendorTransaction.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], VendorTransaction.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        ref: 'CollectRequest',
        type: mongoose_2.default.Schema.Types.ObjectId,
    }),
    __metadata("design:type", collect_request_schema_1.CollectRequest)
], VendorTransaction.prototype, "collect_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: collect_request_schema_1.Gateway.PHONEPE }),
    __metadata("design:type", String)
], VendorTransaction.prototype, "gateway", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], VendorTransaction.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], VendorTransaction.prototype, "vendor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], VendorTransaction.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], VendorTransaction.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], VendorTransaction.prototype, "custom_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], VendorTransaction.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: '' }),
    __metadata("design:type", Date)
], VendorTransaction.prototype, "payment_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: false,
        type: [
            {
                vendor_id: { type: String, required: true },
                account: { type: String, required: false },
                percentage: { type: Number, required: false },
                amount: { type: Number, required: false },
                notes: {
                    type: {
                        branch: { type: String, required: false },
                        name: { type: String, required: false },
                    },
                    required: false,
                },
                linked_account_notes: { type: [String], required: false },
                on_hold: { type: Boolean, required: false },
                on_hold_until: { type: Date, required: false },
            },
        ],
    }),
    __metadata("design:type", Array)
], VendorTransaction.prototype, "razorpay_vendors", void 0);
exports.VendorTransaction = VendorTransaction = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], VendorTransaction);
exports.VendorTransactionSchema = mongoose_1.SchemaFactory.createForClass(VendorTransaction);
//# sourceMappingURL=vendor.Transaction.schema.js.map