"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashfreeModule = void 0;
const common_1 = require("@nestjs/common");
const cashfree_service_1 = require("./cashfree.service");
const database_module_1 = require("../database/database.module");
const cashfree_controller_1 = require("./cashfree.controller");
const edviron_pg_module_1 = require("../edviron-pg/edviron-pg.module");
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
const razorpay_service_1 = require("../razorpay/razorpay.service");
let CashfreeModule = class CashfreeModule {
};
exports.CashfreeModule = CashfreeModule;
exports.CashfreeModule = CashfreeModule = __decorate([
    (0, common_1.Module)({
        providers: [cashfree_service_1.CashfreeService, easebuzz_service_1.EasebuzzService, razorpay_service_1.RazorpayService],
        imports: [
            database_module_1.DatabaseModule,
            (0, common_1.forwardRef)(() => edviron_pg_module_1.EdvironPgModule),
        ],
        exports: [cashfree_service_1.CashfreeService],
        controllers: [cashfree_controller_1.CashfreeController],
    })
], CashfreeModule);
//# sourceMappingURL=cashfree.module.js.map