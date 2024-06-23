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
exports.CheckStatusController = void 0;
const common_1 = require("@nestjs/common");
const check_status_service_1 = require("./check-status.service");
const sign_1 = require("../utils/sign");
const _jwt = require("jsonwebtoken");
let CheckStatusController = class CheckStatusController {
    constructor(checkStatusService) {
        this.checkStatusService = checkStatusService;
    }
    async checkStatus(transactionId, jwt) {
        const status = await this.checkStatusService.checkStatus(transactionId);
        return (0, sign_1.sign)(status);
    }
    async checkCustomOrderStatus(transactionId, jwt) {
        if (!jwt)
            throw new common_1.BadRequestException('JWT is required');
        const decrypted = _jwt.verify(jwt, process.env.KEY);
        if (JSON.stringify({
            transactionId: decrypted.transactionId,
        }) !==
            JSON.stringify({
                transactionId,
            })) {
            throw new Error('Request forged');
        }
        else {
            const status = await this.checkStatusService.checkStatusByOrderId(transactionId, decrypted.trusteeId);
            return (0, sign_1.sign)(status);
        }
    }
};
exports.CheckStatusController = CheckStatusController;
__decorate([
    (0, common_1.Get)('/'),
    __param(0, (0, common_1.Query)('transactionId')),
    __param(1, (0, common_1.Query)('jwt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CheckStatusController.prototype, "checkStatus", null);
__decorate([
    (0, common_1.Get)('/custom-order'),
    __param(0, (0, common_1.Query)('transactionId')),
    __param(1, (0, common_1.Query)('jwt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CheckStatusController.prototype, "checkCustomOrderStatus", null);
exports.CheckStatusController = CheckStatusController = __decorate([
    (0, common_1.Controller)('check-status'),
    __metadata("design:paramtypes", [check_status_service_1.CheckStatusService])
], CheckStatusController);
//# sourceMappingURL=check-status.controller.js.map