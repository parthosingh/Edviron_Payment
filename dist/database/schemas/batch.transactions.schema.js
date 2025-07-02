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
exports.BatchTransactionsSchema = exports.BatchTransactions = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let BatchTransactions = class BatchTransactions {
};
exports.BatchTransactions = BatchTransactions;
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], BatchTransactions.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ nullable: true }),
    __metadata("design:type", String)
], BatchTransactions.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], BatchTransactions.prototype, "total_order_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], BatchTransactions.prototype, "total_transaction_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", Number)
], BatchTransactions.prototype, "total_transactions", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], BatchTransactions.prototype, "month", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], BatchTransactions.prototype, "year", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], BatchTransactions.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({}),
    __metadata("design:type", String)
], BatchTransactions.prototype, "status", void 0);
exports.BatchTransactions = BatchTransactions = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], BatchTransactions);
exports.BatchTransactionsSchema = mongoose_1.SchemaFactory.createForClass(BatchTransactions);
//# sourceMappingURL=batch.transactions.schema.js.map