"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsModule = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const reports_controller_1 = require("./reports.controller");
const database_module_1 = require("../database/database.module");
const cashfree_module_1 = require("../cashfree/cashfree.module");
const edviron_pg_module_1 = require("../edviron-pg/edviron-pg.module");
const aws_s3_service_service_1 = require("../aws-s3-service/aws-s3-service.service");
let ReportsModule = class ReportsModule {
};
exports.ReportsModule = ReportsModule;
exports.ReportsModule = ReportsModule = __decorate([
    (0, common_1.Module)({
        providers: [reports_service_1.ReportsService, aws_s3_service_service_1.AwsS3ServiceService],
        imports: [database_module_1.DatabaseModule, cashfree_module_1.CashfreeModule, edviron_pg_module_1.EdvironPgModule],
        controllers: [reports_controller_1.ReportsController]
    })
], ReportsModule);
//# sourceMappingURL=reports.module.js.map