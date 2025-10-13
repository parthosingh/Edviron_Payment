"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayModule = void 0;
const common_1 = require("@nestjs/common");
const razorpay_controller_1 = require("./razorpay.controller");
const razorpay_service_1 = require("./razorpay.service");
const database_module_1 = require("../database/database.module");
const cashfree_module_1 = require("../cashfree/cashfree.module");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const razorpay_nonseamless_service_1 = require("../razorpay-nonseamless/razorpay-nonseamless.service");
let RazorpayModule = class RazorpayModule {
};
exports.RazorpayModule = RazorpayModule;
exports.RazorpayModule = RazorpayModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, (0, common_1.forwardRef)(() => cashfree_module_1.CashfreeModule)],
        controllers: [razorpay_controller_1.RazorpayController],
        providers: [razorpay_service_1.RazorpayService, edviron_pg_service_1.EdvironPgService, razorpay_nonseamless_service_1.RazorpayNonseamlessService],
        exports: [razorpay_service_1.RazorpayService],
    })
], RazorpayModule);
//# sourceMappingURL=razorpay.module.js.map