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
        ],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map