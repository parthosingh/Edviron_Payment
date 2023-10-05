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
exports.CollectController = void 0;
const common_1 = require("@nestjs/common");
const collect_service_1 = require("./collect.service");
const _jwt = require("jsonwebtoken");
const sign_1 = require("../utils/sign");
let CollectController = class CollectController {
    constructor(collectService) {
        this.collectService = collectService;
    }
    async collect(body) {
        const { amount, callbackUrl, jwt } = body;
        if (!amount || !callbackUrl || !jwt)
            throw new common_1.BadRequestException("Invalid request");
        try {
            const decrypted = await _jwt.verify(jwt, process.env.KEY);
            console.log(JSON.stringify(decrypted), JSON.stringify({
                amount,
                callbackUrl
            }));
            if (JSON.stringify(decrypted) !== JSON.stringify({
                amount,
                callbackUrl
            })) {
                throw new Error("Request forged");
            }
            else {
                return (0, sign_1.sign)(await this.collectService.collect(amount, callbackUrl));
            }
        }
        catch (e) {
            console.log(e.message);
            throw new common_1.UnauthorizedException();
        }
    }
};
exports.CollectController = CollectController;
__decorate([
    (0, common_1.Post)("/"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CollectController.prototype, "collect", null);
exports.CollectController = CollectController = __decorate([
    (0, common_1.Controller)('collect'),
    __metadata("design:paramtypes", [collect_service_1.CollectService])
], CollectController);
//# sourceMappingURL=collect.controller.js.map