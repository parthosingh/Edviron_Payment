"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartgatewayModule = void 0;
const common_1 = require("@nestjs/common");
const smartgateway_controller_1 = require("./smartgateway.controller");
const smartgateway_service_1 = require("./smartgateway.service");
const database_module_1 = require("../database/database.module");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const cashfree_service_1 = require("../cashfree/cashfree.service");
const razorpay_service_1 = require("../razorpay/razorpay.service");
let SmartgatewayModule = class SmartgatewayModule {
};
exports.SmartgatewayModule = SmartgatewayModule;
exports.SmartgatewayModule = SmartgatewayModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [smartgateway_controller_1.SmartgatewayController],
        providers: [
            smartgateway_service_1.SmartgatewayService,
            edviron_pg_service_1.EdvironPgService,
            cashfree_service_1.CashfreeService,
            razorpay_service_1.RazorpayService,
        ],
    })
], SmartgatewayModule);
//# sourceMappingURL=smartgateway.module.js.map