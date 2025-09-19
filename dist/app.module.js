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
const pos_paytm_controller_1 = require("./pos-paytm/pos-paytm.controller");
const pos_paytm_service_1 = require("./pos-paytm/pos-paytm.service");
const nttdata_module_1 = require("./nttdata/nttdata.module");
const worldline_module_1 = require("./worldline/worldline.module");
const razorpay_nonseamless_module_1 = require("./razorpay-nonseamless/razorpay-nonseamless.module");
const razorpay_nonseamless_controller_1 = require("./razorpay-nonseamless/razorpay-nonseamless.controller");
const razorpay_nonseamless_service_1 = require("./razorpay-nonseamless/razorpay-nonseamless.service");
const worldline_service_1 = require("./worldline/worldline.service");
const worldline_controller_1 = require("./worldline/worldline.controller");
const gatepay_module_1 = require("./gatepay/gatepay.module");
const reports_module_1 = require("./reports/reports.module");
const aws_s3_service_module_1 = require("./aws-s3-service/aws-s3-service.module");
const razorpay_module_1 = require("./razorpay/razorpay.module");
const gateway_controller_1 = require("./gateway/gateway.controller");
const gateway_module_1 = require("./gateway/gateway.module");
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
            smartgateway_module_1.SmartgatewayModule,
            nttdata_module_1.NttdataModule,
            razorpay_nonseamless_module_1.RazorpayNonseamlessModule,
            worldline_module_1.WorldlineModule,
            razorpay_module_1.RazorpayModule,
            database_module_1.DatabaseModule,
            gatepay_module_1.GatepayModule,
            reports_module_1.ReportsModule,
            aws_s3_service_module_1.AwsS3ServiceModule,
            gateway_module_1.GatewayModule,
        ],
        controllers: [
            app_controller_1.AppController,
            easebuzz_controller_1.EasebuzzController,
            cashfree_controller_1.CashfreeController,
            pos_paytm_controller_1.PosPaytmController,
            worldline_controller_1.WorldlineController,
            razorpay_nonseamless_controller_1.RazorpayNonseamlessController,
            gateway_controller_1.GatewayController,
        ],
        providers: [
            app_service_1.AppService,
            cashfree_service_1.CashfreeService,
            easebuzz_service_1.EasebuzzService,
            ccavenue_service_1.CcavenueService,
            pos_paytm_service_1.PosPaytmService,
            worldline_service_1.WorldlineService,
            razorpay_nonseamless_service_1.RazorpayNonseamlessService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map