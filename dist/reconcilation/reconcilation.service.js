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
exports.ReconcilationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = require("axios");
const database_service_1 = require("../database/database.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
let ReconcilationService = class ReconcilationService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async reconPendingGateway() {
        try {
            const cronManagement = await this.databaseService.cronManagement.findOne({
                event: 'TERMINATE_GATEWAY'
            });
            if (!cronManagement)
                return;
            if (!cronManagement.startDate || !cronManagement.endDate)
                return;
            const collectReqs = await this.databaseService.CollectRequestModel.find({
                gateway: "PENDING",
                createdAt: {
                    $gte: cronManagement.startDate,
                    $lte: cronManagement.endDate
                }
            });
            if (!collectReqs.length)
                return;
            const updates = [];
            for (const req of collectReqs) {
                const reqStatus = await this.databaseService.CollectRequestStatusModel.findOne({ collect_id: req._id });
                if (!reqStatus)
                    continue;
                req.gateway = collect_request_schema_1.Gateway.EXPIRED;
                reqStatus.status = collect_req_status_schema_1.PaymentStatus.USER_DROPPED;
                updates.push(req.save(), reqStatus.save());
            }
            await Promise.all(updates);
            console.log(`✅ Updated ${updates.length / 2} records to EXPIRED / USER_DROPPED`);
            cronManagement.startDate = new Date(cronManagement.startDate.getTime() + 25 * 60 * 1000);
            cronManagement.endDate = new Date(cronManagement.endDate.getTime() + 25 * 60 * 1000);
            await cronManagement.save();
        }
        catch (e) {
            try {
                await this.databaseService.cronManagement.create({
                    event: "TERMINATE_GATEWAY_ERROR",
                    error_msg: e.message
                });
                throw new common_1.BadRequestException(e.message);
            }
            catch (e) {
                console.log(e);
            }
            throw new common_1.BadRequestException(e.message);
        }
    }
    async reconStatus() {
        try {
            const cronManagement = await this.databaseService.cronManagement.findOne({
                event: 'TERMINATE_GATEWAY'
            });
            if (!cronManagement)
                return;
            if (!cronManagement.startDate || !cronManagement.endDate)
                return;
            const collectReqs = await this.databaseService.CollectRequestStatusModel.find({
                status: "PENDING",
                createdAt: {
                    $gte: cronManagement.startDate,
                    $lte: cronManagement.endDate
                }
            });
            if (!collectReqs.length)
                return;
            const updates = [];
            for (const req of collectReqs) {
                const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: req._id,
                });
                if (!requestStatus)
                    continue;
                const config = {
                    method: 'get',
                    url: `${process.env.URL}/check-status?transactionId=${req._id.toString()}`,
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        'x-api-version': '2023-08-01',
                    },
                };
                let statusResp;
                try {
                    const { data } = await axios_1.default.request(config);
                    statusResp = data;
                }
                catch (err) {
                    console.error(`Error fetching status for ${req._id}:`, err.message);
                    continue;
                }
                const gatewayStatus = statusResp?.status?.toUpperCase();
                if (gatewayStatus === 'PENDING') {
                    requestStatus.status = collect_req_status_schema_1.PaymentStatus.USER_DROPPED;
                }
                else {
                    requestStatus.status = gatewayStatus || collect_req_status_schema_1.PaymentStatus.USER_DROPPED;
                }
                updates.push(requestStatus.save());
            }
            await Promise.all(updates);
            cronManagement.startDate = new Date(cronManagement.startDate.getTime() + 25 * 60 * 1000);
            cronManagement.endDate = new Date(cronManagement.endDate.getTime() + 25 * 60 * 1000);
            await cronManagement.save();
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async terminateNotInitiatedOrder(collect_id) {
        try {
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request || !request.createdAt) {
                throw new Error('Collect Request not found');
            }
            const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: request._id,
            });
            if (!requestStatus) {
                throw new Error('Collect Request Status not found');
            }
            if (requestStatus.status !== 'PENDING') {
                return;
            }
            if (request.gateway !== 'PENDING') {
                const config = {
                    method: 'get',
                    url: `${process.env.URL}/check-status?transactionId=${collect_id}`,
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        'x-api-version': '2023-08-01',
                    }
                };
                const { data: status } = await axios_1.default.request(config);
                if (status.status.toUpperCase() !== 'SUCCESS') {
                    if (status.status !== 'PENDING') {
                        requestStatus.status = status;
                        await requestStatus.save();
                    }
                    else {
                        requestStatus.status = collect_req_status_schema_1.PaymentStatus.USER_DROPPED;
                        await requestStatus.save();
                    }
                }
                return true;
            }
            const createdAt = request.createdAt;
            const currentTime = new Date();
            const timeDifference = currentTime.getTime() - createdAt.getTime();
            const differenceInMinutes = timeDifference / (1000 * 60);
            if (differenceInMinutes > 25) {
                request.gateway = collect_request_schema_1.Gateway.EXPIRED;
                requestStatus.status = collect_req_status_schema_1.PaymentStatus.USER_DROPPED;
                await request.save();
                await requestStatus.save();
                return true;
            }
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
        return true;
    }
    async createCronEvent(event) {
        try {
            const date = new Date();
            await this.databaseService.cronManagement.create({
                event,
                startDate: new Date(date.getTime() - 50 * 60 * 1000),
                endDate: new Date(date.getTime() - 25 * 60 * 1000)
            });
            return;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.ReconcilationService = ReconcilationService;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconcilationService.prototype, "reconPendingGateway", null);
__decorate([
    (0, schedule_1.Cron)('*/30 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconcilationService.prototype, "reconStatus", null);
exports.ReconcilationService = ReconcilationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ReconcilationService);
//# sourceMappingURL=reconcilation.service.js.map