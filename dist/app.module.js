"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const collect_module_1 = require("./collect/collect.module");
const database_module_1 = require("./database/database.module");
const phonepe_module_1 = require("./phonepe/phonepe.module");
const check_status_module_1 = require("./check-status/check-status.module");
const hdfc_module_1 = require("./hdfc/hdfc.module");
const edviron_pg_module_1 = require("./edviron-pg/edviron-pg.module");
const ccavenue_module_1 = require("./ccavenue/ccavenue.module");
const easebuzz_controller_1 = require("./easebuzz/easebuzz.controller");
const easebuzz_service_1 = require("./easebuzz/easebuzz.service");
const cashfree_controller_1 = require("./cashfree/cashfree.controller");
const cashfree_module_1 = require("./cashfree/cashfree.module");
const smartgateway_module_1 = require("./smartgateway/smartgateway.module");
const pay_u_module_1 = require("./pay-u/pay-u.module");
const hdfc_razorpay_module_1 = require("./hdfc_razporpay/hdfc_razorpay.module");
const cashfree_service_1 = require("./cashfree/cashfree.service");
const ccavenue_service_1 = require("./ccavenue/ccavenue.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            collect_module_1.CollectModule,
            database_module_1.DatabaseModule,
            phonepe_module_1.PhonepeModule,
            check_status_module_1.CheckStatusModule,
            hdfc_module_1.HdfcModule,
            edviron_pg_module_1.EdvironPgModule,
            ccavenue_module_1.CcavenueModule,
            cashfree_module_1.CashfreeModule,
            pay_u_module_1.PayUModule,
            hdfc_razorpay_module_1.HdfcRazorpayModule,
            smartgateway_module_1.SmartgatewayModule
        ],
        controllers: [app_controller_1.AppController, easebuzz_controller_1.EasebuzzController, cashfree_controller_1.CashfreeController],
        providers: [app_service_1.AppService, cashfree_service_1.CashfreeService, easebuzz_service_1.EasebuzzService, ccavenue_service_1.CcavenueService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map