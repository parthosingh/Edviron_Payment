"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const collect_request_schema_1 = require("./schemas/collect_request.schema");
const database_service_1 = require("./database.service");
const dotenv = require("dotenv");
const collect_req_status_schema_1 = require("./schemas/collect_req_status.schema");
const webhooks_schema_1 = require("./schemas/webhooks.schema");
const vendor_Transaction_schema_1 = require("./schemas/vendor.Transaction.schema");
const erp_webhooks_logs_schema_1 = require("./schemas/erp.webhooks.logs.schema");
const batch_transactions_schema_1 = require("./schemas/batch.transactions.schema");
const error_logs_schema_1 = require("./schemas/error.logs.schema");
const platform_charges_schema_1 = require("./schemas/platform.charges.schema");
const installments_schema_1 = require("./schemas/installments.schema");
const student_detail_schema_1 = require("./schemas/student_detail.schema");
dotenv.config();
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI),
            mongoose_1.MongooseModule.forFeature([
                { name: collect_request_schema_1.CollectRequest.name, schema: collect_request_schema_1.CollectRequestSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: collect_req_status_schema_1.CollectRequestStatus.name, schema: collect_req_status_schema_1.CollectRequestStatusSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: webhooks_schema_1.Webhooks.name, schema: webhooks_schema_1.WebhooksSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: vendor_Transaction_schema_1.VendorTransaction.name, schema: vendor_Transaction_schema_1.VendorTransactionSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: erp_webhooks_logs_schema_1.ErpWebhooksLogs.name, schema: erp_webhooks_logs_schema_1.ErpWebhooksLogsSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: batch_transactions_schema_1.BatchTransactions.name, schema: batch_transactions_schema_1.BatchTransactionsSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: error_logs_schema_1.ErrorLogs.name, schema: error_logs_schema_1.ErrorLogsSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: platform_charges_schema_1.SchoolMdr.name, schema: platform_charges_schema_1.SchoolMdrSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: installments_schema_1.Installments.name, schema: installments_schema_1.InstallmentsSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: student_detail_schema_1.StudentDetail.name, schema: student_detail_schema_1.StudentDetailSchema },
            ]),
        ],
        providers: [database_service_1.DatabaseService],
        exports: [
            database_service_1.DatabaseService,
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI),
            mongoose_1.MongooseModule.forFeature([
                { name: collect_request_schema_1.CollectRequest.name, schema: collect_request_schema_1.CollectRequestSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: collect_req_status_schema_1.CollectRequestStatus.name, schema: collect_req_status_schema_1.CollectRequestStatusSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: webhooks_schema_1.Webhooks.name, schema: webhooks_schema_1.WebhooksSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: vendor_Transaction_schema_1.VendorTransaction.name, schema: vendor_Transaction_schema_1.VendorTransactionSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: erp_webhooks_logs_schema_1.ErpWebhooksLogs.name, schema: erp_webhooks_logs_schema_1.ErpWebhooksLogsSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: batch_transactions_schema_1.BatchTransactions.name, schema: batch_transactions_schema_1.BatchTransactionsSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: error_logs_schema_1.ErrorLogs.name, schema: error_logs_schema_1.ErrorLogsSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: platform_charges_schema_1.SchoolMdr.name, schema: platform_charges_schema_1.SchoolMdrSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: installments_schema_1.Installments.name, schema: installments_schema_1.InstallmentsSchema },
            ]),
            mongoose_1.MongooseModule.forFeature([
                { name: student_detail_schema_1.StudentDetail.name, schema: student_detail_schema_1.StudentDetailSchema },
            ]),
        ],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map