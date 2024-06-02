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
exports.CheckStatusService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const hdfc_service_1 = require("../hdfc/hdfc.service");
const phonepe_service_1 = require("../phonepe/phonepe.service");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
let CheckStatusService = class CheckStatusService {
    constructor(databaseService, hdfcService, phonePeService, edvironPgService) {
        this.databaseService = databaseService;
        this.hdfcService = hdfcService;
        this.phonePeService = phonePeService;
        this.edvironPgService = edvironPgService;
    }
    async checkStatus(collect_request_id) {
        console.log('checking status', collect_request_id);
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        if (!collectRequest) {
            console.log('Collect request not found', collect_request_id);
            throw new common_1.NotFoundException('Collect request not found');
        }
        console.log('checking status', collect_request_id, collectRequest);
        switch (collectRequest?.gateway) {
            case collect_request_schema_1.Gateway.HDFC:
                return await this.hdfcService.checkStatus(collect_request_id);
            case collect_request_schema_1.Gateway.PHONEPE:
                return await this.phonePeService.checkStatus(collect_request_id);
            case collect_request_schema_1.Gateway.EDVIRON_PG:
                return await this.edvironPgService.checkStatus(collect_request_id, collectRequest);
        }
    }
    async checkStatusByOrderId(order_id) {
        console.log('checking status for custom order id', order_id);
        const collectRequest = await this.databaseService.CollectRequestModel.findOne({
            custom_order_id: order_id,
        });
        if (!collectRequest) {
            console.log('Collect request not found', order_id);
            throw new common_1.NotFoundException('Collect request not found');
        }
        console.log('checking status', order_id, collectRequest);
        switch (collectRequest?.gateway) {
            case collect_request_schema_1.Gateway.HDFC:
                return await this.hdfcService.checkStatus(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.PHONEPE:
                return await this.phonePeService.checkStatus(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.EDVIRON_PG:
                return await this.edvironPgService.checkStatus(collectRequest._id.toString(), collectRequest);
        }
    }
};
exports.CheckStatusService = CheckStatusService;
exports.CheckStatusService = CheckStatusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        hdfc_service_1.HdfcService,
        phonepe_service_1.PhonepeService,
        edviron_pg_service_1.EdvironPgService])
], CheckStatusService);
//# sourceMappingURL=check-status.service.js.map