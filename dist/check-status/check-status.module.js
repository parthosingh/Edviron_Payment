"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckStatusModule = void 0;
const common_1 = require("@nestjs/common");
const check_status_controller_1 = require("./check-status.controller");
const check_status_service_1 = require("./check-status.service");
const database_module_1 = require("../database/database.module");
const phonepe_module_1 = require("../phonepe/phonepe.module");
const hdfc_module_1 = require("../hdfc/hdfc.module");
let CheckStatusModule = class CheckStatusModule {
};
exports.CheckStatusModule = CheckStatusModule;
exports.CheckStatusModule = CheckStatusModule = __decorate([
    (0, common_1.Module)({
        controllers: [check_status_controller_1.CheckStatusController],
        providers: [check_status_service_1.CheckStatusService],
        imports: [database_module_1.DatabaseModule, phonepe_module_1.PhonepeModule, hdfc_module_1.HdfcModule],
    })
], CheckStatusModule);
//# sourceMappingURL=check-status.module.js.map