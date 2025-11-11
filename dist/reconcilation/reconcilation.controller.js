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
exports.ReconcilationController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const jwt = require("jsonwebtoken");
const mongoose_1 = require("mongoose");
let ReconcilationController = class ReconcilationController {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async easebuzzRecon(body) {
        const { sign, utr, collect_ids, school_name } = body;
        try {
            if (!sign || !utr || !collect_ids || collect_ids.length === 0) {
                throw new common_1.BadRequestException(`Required Field Missing`);
            }
            const decoded = jwt.verify(sign, process.env.KEY);
            if (decoded.utr !== utr) {
                throw new common_1.BadRequestException(`Request Fordge | Invalid Sign`);
            }
            const collectObjectIds = collect_ids.map(id => {
                const cleanId = id.startsWith('upi_') ? id.replace('upi_', '') : id;
                return new mongoose_1.Types.ObjectId(cleanId);
            });
            const aggregation = await this.databaseService.CollectRequestStatusModel.aggregate([
                {
                    $match: {
                        collect_id: { $in: collectObjectIds }
                    }
                },
                {
                    $lookup: {
                        from: 'collectrequests',
                        localField: 'collect_id',
                        foreignField: '_id',
                        as: 'collectRequest'
                    }
                },
                {
                    $unwind: {
                        path: '$collectRequest'
                    }
                },
                {
                    $project: {
                        _id: 0,
                        custom_order_id: '$collectRequest.custom_order_id',
                        collect_id: 1,
                        order_id: '$collect_id',
                        event_status: '$status',
                        event_settlement_amount: '$order_amount',
                        event_time: '$payment_time',
                        event_amount: '$transaction_amount',
                        payment_time: 1,
                        order_amount: 1,
                        transaction_amount: 1,
                        additional_data: '$collectRequest.additional_data',
                        payment_group: 1,
                        details: 1,
                        school_id: '$collectRequest.school_id',
                        payment_id: 1
                    }
                }
            ]);
            const formattedInfo = aggregation.map((data) => {
                const additional_data = JSON.parse(data.additional_data) || {};
                return {
                    ...data,
                    settlement_utr: utr,
                    student_id: additional_data.student_details?.student_id || 'NA',
                    school_name: school_name,
                    student_name: additional_data.student_details?.student_name || 'NA',
                    student_email: additional_data.student_details?.student_email || 'NA',
                    student_phone_no: additional_data.student_details?.student_phone_no || 'NA',
                };
            });
            return formattedInfo;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.ReconcilationController = ReconcilationController;
__decorate([
    (0, common_1.Post)('transactions-info'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReconcilationController.prototype, "easebuzzRecon", null);
exports.ReconcilationController = ReconcilationController = __decorate([
    (0, common_1.Controller)('reconcilation'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ReconcilationController);
//# sourceMappingURL=reconcilation.controller.js.map