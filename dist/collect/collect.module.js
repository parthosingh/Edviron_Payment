"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectModule = void 0;
const common_1 = require("@nestjs/common");
const ccavenue_module_1 = require("../ccavenue/ccavenue.module");
const ccavenue_service_1 = require("../ccavenue/ccavenue.service");
const hdfc_razorpay_service_1 = require("../hdfc_razporpay/hdfc_razorpay.service");
const pay_u_service_1 = require("../pay-u/pay-u.service");
const database_module_1 = require("../database/database.module");
const hdfc_module_1 = require("../hdfc/hdfc.module");
const phonepe_module_1 = require("../phonepe/phonepe.module");
const smartgateway_service_1 = require("../smartgateway/smartgateway.service");
const edviron_pg_module_1 = require("../edviron-pg/edviron-pg.module");
const collect_controller_1 = require("./collect.controller");
const collect_service_1 = require("./collect.service");
const nttdata_service_1 = require("../nttdata/nttdata.service");
const pos_paytm_service_1 = require("../pos-paytm/pos-paytm.service");
const worldline_service_1 = require("../worldline/worldline.service");
const razorpay_nonseamless_service_1 = require("../razorpay-nonseamless/razorpay-nonseamless.service");
let CollectModule = class CollectModule {
};
exports.CollectModule = CollectModule;
exports.CollectModule = CollectModule = __decorate([
    (0, common_1.Module)({
        controllers: [collect_controller_1.CollectController],
        providers: [collect_service_1.CollectService, ccavenue_service_1.CcavenueService, hdfc_razorpay_service_1.HdfcRazorpayService, pay_u_service_1.PayUService, smartgateway_service_1.SmartgatewayService, nttdata_service_1.NttdataService, razorpay_nonseamless_service_1.RazorpayNonseamlessService, pos_paytm_service_1.PosPaytmService, worldline_service_1.WorldlineService],
        imports: [
            phonepe_module_1.PhonepeModule,
            database_module_1.DatabaseModule,
            hdfc_module_1.HdfcModule,
            edviron_pg_module_1.EdvironPgModule,
            ccavenue_module_1.CcavenueModule,
        ],
    })
], CollectModule);
//# sourceMappingURL=collect.module.js.map