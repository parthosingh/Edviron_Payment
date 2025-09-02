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
exports.EdvironPayController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let EdvironPayController = class EdvironPayController {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async upsertInstallments(body) {
        const { school_id, trustee_id, student_id, student_number, student_name, student_email, additional_data, amount, net_amount, discount, year, month, gateway, isInstallement, installments, } = body;
        console.log({ isInstallement, installments });
        if (isInstallement && installments && installments.length > 0) {
            await Promise.all(installments.map(async (installment) => {
                const filter = {
                    school_id,
                    trustee_id,
                    student_id,
                    month: installment.month || month,
                    year: installment.year || year,
                };
                const existing = await this.databaseService.InstallmentsModel.findOne(filter);
                if (!existing) {
                    return this.databaseService.InstallmentsModel.create({
                        school_id,
                        trustee_id,
                        student_id,
                        student_number,
                        student_name,
                        student_email,
                        additional_data,
                        amount: installment.amount,
                        net_amount: installment.net_amount,
                        discount: installment.discount,
                        year: installment.year || year,
                        month: installment.month || month,
                        gateway,
                        fee_heads: installment.fee_heads,
                        status: 'unpaid',
                        label: installment.label,
                        body: installment.body,
                    });
                }
                if (existing.status === 'paid') {
                    return existing;
                }
                console.log({ existing });
                return this.databaseService.InstallmentsModel.updateOne(filter, {
                    $set: {
                        amount: installment.amount,
                        net_amount: installment.net_amount,
                        discount: installment.discount,
                        fee_head: installment.fee_head,
                        label: installment.label,
                        body: installment.body,
                        gateway,
                        additional_data,
                        student_number,
                        student_name,
                        student_email,
                        fee_heads: installment.fee_heads,
                    },
                });
            }));
        }
        else {
            throw new Error('No installments found or isInstallement is false');
        }
        return { status: 'installment updated successfully for student_id: ' + student_id };
    }
};
exports.EdvironPayController = EdvironPayController;
__decorate([
    (0, common_1.Post)('installments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "upsertInstallments", null);
exports.EdvironPayController = EdvironPayController = __decorate([
    (0, common_1.Controller)('edviron-pay'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EdvironPayController);
//# sourceMappingURL=edviron-pay.controller.js.map