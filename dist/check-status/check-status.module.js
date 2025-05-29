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
const edviron_pg_module_1 = require("../edviron-pg/edviron-pg.module");
const ccavenue_service_1 = require("../ccavenue/ccavenue.service");
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
const cashfree_module_1 = require("../cashfree/cashfree.module");
const pay_u_service_1 = require("../pay-u/pay-u.service");
const hdfc_razorpay_service_1 = require("../hdfc_razporpay/hdfc_razorpay.service");
const smartgateway_service_1 = require("../smartgateway/smartgateway.service");
const nttdata_service_1 = require("../nttdata/nttdata.service");
let CheckStatusModule = class CheckStatusModule {
};
exports.CheckStatusModule = CheckStatusModule;
exports.CheckStatusModule = CheckStatusModule = __decorate([
    (0, common_1.Module)({
        controllers: [check_status_controller_1.CheckStatusController],
        providers: [
            check_status_service_1.CheckStatusService,
            ccavenue_service_1.CcavenueService,
            easebuzz_service_1.EasebuzzService,
            smartgateway_service_1.SmartgatewayService,
            pay_u_service_1.PayUService,
            hdfc_razorpay_service_1.HdfcRazorpayService,
            nttdata_service_1.NttdataService,
        ],
        imports: [
            database_module_1.DatabaseModule,
            phonepe_module_1.PhonepeModule,
            cashfree_module_1.CashfreeModule,
            hdfc_module_1.HdfcModule,
            edviron_pg_module_1.EdvironPgModule,
        ],
    })
], CheckStatusModule);
//# sourceMappingURL=check-status.module.js.map