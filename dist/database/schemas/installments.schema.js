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
exports.ErrorLogsSchema = exports.ErrorLogs = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let ErrorLogs = class ErrorLogs {
};
exports.ErrorLogs = ErrorLogs;
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "student_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "student_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "student_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "student_email", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "additional_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], ErrorLogs.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], ErrorLogs.prototype, "net_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], ErrorLogs.prototype, "discount", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "year", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "month", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: false,
        type: [
            {
                label: { type: String, required: true },
                amount: { type: Number, required: true },
                net_amount: { type: Number, required: true },
                discount: { type: Number, required: true },
                gst: { type: Number, required: true },
            },
        ],
    }),
    __metadata("design:type", Array)
], ErrorLogs.prototype, "installments", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "label", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], ErrorLogs.prototype, "body", void 0);
exports.ErrorLogs = ErrorLogs = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ErrorLogs);
exports.ErrorLogsSchema = mongoose_1.SchemaFactory.createForClass(ErrorLogs);
//# sourceMappingURL=installments.schema.js.map