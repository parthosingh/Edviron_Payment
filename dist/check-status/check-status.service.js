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
let CheckStatusService = class CheckStatusService {
    constructor(databaseService, hdfcService, phonePeService) {
        this.databaseService = databaseService;
        this.hdfcService = hdfcService;
        this.phonePeService = phonePeService;
    }
    async checkStatus(transactionId) {
        const collectRequest = await this.databaseService.CollectRequestModel.findById(transactionId);
        switch (collectRequest?.gateway) {
            case collect_request_schema_1.Gateway.HDFC:
                return await this.hdfcService.checkStatus(transactionId);
            case collect_request_schema_1.Gateway.PHONEPE:
                return await this.phonePeService.checkStatus(transactionId);
        }
    }
};
exports.CheckStatusService = CheckStatusService;
exports.CheckStatusService = CheckStatusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService, hdfc_service_1.HdfcService, phonepe_service_1.PhonepeService])
], CheckStatusService);
//# sourceMappingURL=check-status.service.js.map