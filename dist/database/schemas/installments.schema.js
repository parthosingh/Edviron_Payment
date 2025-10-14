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
exports.InstallmentsSchema = exports.Installments = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const collect_request_schema_1 = require("./collect_request.schema");
let Installments = class Installments {
};
exports.Installments = Installments;
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        ref: 'CollectRequest',
        type: mongoose_2.default.Schema.Types.ObjectId,
    }),
    __metadata("design:type", collect_request_schema_1.CollectRequest)
], Installments.prototype, "collect_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        ref: 'StudentDetails'
    }),
    __metadata("design:type", String)
], Installments.prototype, "student_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "student_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "student_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "student_email", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "additional_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], Installments.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], Installments.prototype, "net_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], Installments.prototype, "discount", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "year", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "callback_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "month", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: false,
        type: [
            {
                label: { type: String, required: true },
                amount: { type: Number, required: true },
                net_amount: { type: Number, required: true },
                discount: { type: Number, required: false },
                gst: { type: Number, required: false },
            },
        ],
    }),
    __metadata("design:type", Array)
], Installments.prototype, "fee_heads", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "label", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], Installments.prototype, "gst", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Installments.prototype, "webhook_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], Installments.prototype, "isSplitPayments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], Installments.prototype, "vendors_info", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], Installments.prototype, "easebuzzVendors", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], Installments.prototype, "cashfreeVedors", void 0);
exports.Installments = Installments = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Installments);
exports.InstallmentsSchema = mongoose_1.SchemaFactory.createForClass(Installments);
//# sourceMappingURL=installments.schema.js.map