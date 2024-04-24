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
exports.CollectService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const hdfc_service_1 = require("../hdfc/hdfc.service");
const phonepe_service_1 = require("../phonepe/phonepe.service");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
let CollectService = class CollectService {
    constructor(phonepeService, hdfcService, edvironPgService, databaseService) {
        this.phonepeService = phonepeService;
        this.hdfcService = hdfcService;
        this.edvironPgService = edvironPgService;
        this.databaseService = databaseService;
    }
    async collect(amount, callbackUrl, clientId, clientSecret, school_id, trustee_id, disabled_modes = [], webHook, additional_data) {
        console.log('collect request for amount: ' + amount + ' received.', {
            disabled_modes,
        });
        const gateway = clientId === 'edviron' ? collect_request_schema_1.Gateway.HDFC : collect_request_schema_1.Gateway.EDVIRON_PG;
        const request = await new this.databaseService.CollectRequestModel({
            amount,
            callbackUrl,
            gateway: gateway,
            clientId,
            clientSecret,
            webHookUrl: webHook || null,
            disabled_modes,
            school_id,
            trustee_id,
            additional_data: JSON.stringify(additional_data),
        }).save();
        await new this.databaseService.CollectRequestStatusModel({
            collect_id: request._id,
            status: collect_req_status_schema_1.PaymentStatus.PENDING,
            order_amount: request.amount,
            transaction_amount: request.amount,
            payment_method: null,
        }).save();
        const transaction = (gateway === collect_request_schema_1.Gateway.EDVIRON_PG
            ? await this.edvironPgService.collect(request)
            : await this.hdfcService.collect(request));
        return { url: transaction.url, request };
    }
};
exports.CollectService = CollectService;
exports.CollectService = CollectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [phonepe_service_1.PhonepeService,
        hdfc_service_1.HdfcService,
        edviron_pg_service_1.EdvironPgService,
        database_service_1.DatabaseService])
], CollectService);
//# sourceMappingURL=collect.service.js.map