"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanteenModule = void 0;
const common_1 = require("@nestjs/common");
const canteen_service_1 = require("./canteen.service");
const canteen_controller_1 = require("./canteen.controller");
const database_module_1 = require("../database/database.module");
const cashfree_module_1 = require("../cashfree/cashfree.module");
const check_status_module_1 = require("../check-status/check-status.module");
const edviron_pg_module_1 = require("../edviron-pg/edviron-pg.module");
const razorpay_module_1 = require("../razorpay/razorpay.module");
let CanteenModule = class CanteenModule {
};
exports.CanteenModule = CanteenModule;
exports.CanteenModule = CanteenModule = __decorate([
    (0, common_1.Module)({
        providers: [canteen_service_1.CanteenService],
        imports: [database_module_1.DatabaseModule, cashfree_module_1.CashfreeModule, check_status_module_1.CheckStatusModule, edviron_pg_module_1.EdvironPgModule, razorpay_module_1.RazorpayModule],
        controllers: [canteen_controller_1.CanteenController]
    })
], CanteenModule);
//# sourceMappingURL=canteen.module.js.map