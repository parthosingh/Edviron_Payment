"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatepayModule = void 0;
const common_1 = require("@nestjs/common");
const gatepay_controller_1 = require("./gatepay.controller");
const gatepay_service_1 = require("./gatepay.service");
const database_service_1 = require("../database/database.service");
const database_module_1 = require("../database/database.module");
let GatepayModule = class GatepayModule {
};
exports.GatepayModule = GatepayModule;
exports.GatepayModule = GatepayModule = __decorate([
    (0, common_1.Module)({
        controllers: [gatepay_controller_1.GatepayController],
        providers: [gatepay_service_1.GatepayService, database_service_1.DatabaseService],
        imports: [database_module_1.DatabaseModule]
    })
], GatepayModule);
//# sourceMappingURL=gatepay.module.js.map