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
exports.PosPaytmController = void 0;
const common_1 = require("@nestjs/common");
const pos_paytm_service_1 = require("./pos-paytm.service");
const _jwt = require("jsonwebtoken");
let PosPaytmController = class PosPaytmController {
    constructor(posPaytmService) {
        this.posPaytmService = posPaytmService;
    }
    async initiatePayment(body) {
        const { amount, callbackUrl, jwt, school_id, trustee_id, paytm_pos, platform_charges, additional_data, custom_order_id, req_webhook_urls, school_name, } = body;
        if (!jwt)
            throw new common_1.BadRequestException('JWT not provided');
        if (!amount)
            throw new common_1.BadRequestException('Amount not provided');
        try {
            const decrypt = _jwt.verify(jwt, process.env.KEY);
            if (decrypt.school_id !== school_id) {
                throw new common_1.BadRequestException(`Request Fordge`);
            }
            return await this.posPaytmService.collectPayment(amount, callbackUrl, school_id, trustee_id, paytm_pos, platform_charges, additional_data, custom_order_id, req_webhook_urls, school_name);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.PosPaytmController = PosPaytmController;
__decorate([
    (0, common_1.Post)('initiate-payment'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PosPaytmController.prototype, "initiatePayment", null);
exports.PosPaytmController = PosPaytmController = __decorate([
    (0, common_1.Controller)('pos-paytm'),
    __metadata("design:paramtypes", [pos_paytm_service_1.PosPaytmService])
], PosPaytmController);
//# sourceMappingURL=pos-paytm.controller.js.map