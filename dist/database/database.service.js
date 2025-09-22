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
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const collect_request_schema_1 = require("./schemas/collect_request.schema");
const mongoose_2 = require("mongoose");
const webhooks_schema_1 = require("./schemas/webhooks.schema");
const collect_req_status_schema_1 = require("./schemas/collect_req_status.schema");
const vendor_Transaction_schema_1 = require("./schemas/vendor.Transaction.schema");
const erp_webhooks_logs_schema_1 = require("./schemas/erp.webhooks.logs.schema");
const batch_transactions_schema_1 = require("./schemas/batch.transactions.schema");
const error_logs_schema_1 = require("./schemas/error.logs.schema");
const platform_charges_schema_1 = require("./schemas/platform.charges.schema");
let DatabaseService = class DatabaseService {
    constructor(CollectRequestModel, WebhooksModel, CollectRequestStatusModel, VendorTransactionModel, ErpWebhooksLogsModel, BatchTransactionModel, ErrorLogsModel, PlatformChargeModel) {
        this.CollectRequestModel = CollectRequestModel;
        this.WebhooksModel = WebhooksModel;
        this.CollectRequestStatusModel = CollectRequestStatusModel;
        this.VendorTransactionModel = VendorTransactionModel;
        this.ErpWebhooksLogsModel = ErpWebhooksLogsModel;
        this.BatchTransactionModel = BatchTransactionModel;
        this.ErrorLogsModel = ErrorLogsModel;
        this.PlatformChargeModel = PlatformChargeModel;
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(collect_request_schema_1.CollectRequest.name)),
    __param(1, (0, mongoose_1.InjectModel)(webhooks_schema_1.Webhooks.name)),
    __param(2, (0, mongoose_1.InjectModel)(collect_req_status_schema_1.CollectRequestStatus.name)),
    __param(3, (0, mongoose_1.InjectModel)(vendor_Transaction_schema_1.VendorTransaction.name)),
    __param(4, (0, mongoose_1.InjectModel)(erp_webhooks_logs_schema_1.ErpWebhooksLogs.name)),
    __param(5, (0, mongoose_1.InjectModel)(batch_transactions_schema_1.BatchTransactions.name)),
    __param(6, (0, mongoose_1.InjectModel)(error_logs_schema_1.ErrorLogs.name)),
    __param(7, (0, mongoose_1.InjectModel)(platform_charges_schema_1.SchoolMdr.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], DatabaseService);
//# sourceMappingURL=database.service.js.map