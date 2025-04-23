"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HdfcRazorpayModule = void 0;
const common_1 = require("@nestjs/common");
const hdfc_razorpay_controller_1 = require("./hdfc_razorpay.controller");
const hdfc_razorpay_service_1 = require("./hdfc_razorpay.service");
const database_module_1 = require("../database/database.module");
let HdfcRazorpayModule = class HdfcRazorpayModule {
};
exports.HdfcRazorpayModule = HdfcRazorpayModule;
exports.HdfcRazorpayModule = HdfcRazorpayModule = __decorate([
    (0, common_1.Module)({
        controllers: [hdfc_razorpay_controller_1.HdfcRazorpayController],
        providers: [hdfc_razorpay_service_1.HdfcRazorpayService],
        imports: [database_module_1.DatabaseModule],
    })
], HdfcRazorpayModule);
//# sourceMappingURL=hdfc_razorpay.module.js.map