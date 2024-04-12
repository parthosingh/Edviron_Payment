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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhonepeController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let PhonepeController = class PhonepeController {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async handleRedirect(body, res) {
        res.redirect((await this.databaseService.CollectRequestModel.findById(body.transactionId))?.callbackUrl);
    }
    async handleCallback(body) {
        return 'OK';
    }
};
exports.PhonepeController = PhonepeController;
__decorate([
    (0, common_1.Post)('/redirect'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PhonepeController.prototype, "handleRedirect", null);
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PhonepeController.prototype, "handleCallback", null);
exports.PhonepeController = PhonepeController = __decorate([
    (0, common_1.Controller)('phonepe'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], PhonepeController);
//# sourceMappingURL=phonepe.controller.js.map