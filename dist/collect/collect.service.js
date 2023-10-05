"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const phonepe_service_1 = require("../phonepe/phonepe.service");
let CollectService = class CollectService {
    constructor(phonepeService, databaseService) {
        this.phonepeService = phonepeService;
        this.databaseService = databaseService;
    }
    async collect(amount, callbackUrl) {
        console.log("collect request for amount: " + amount + " received.");
        const request = await new this.databaseService.CollectRequestModel({
            amount,
            callbackUrl
        }).save();
        const transaction = await this.phonepeService.collect(request);
        return { url: transaction.url, request };
    }
};
exports.CollectService = CollectService;
exports.CollectService = CollectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [phonepe_service_1.PhonepeService, database_service_1.DatabaseService])
], CollectService);
//# sourceMappingURL=collect.service.js.map