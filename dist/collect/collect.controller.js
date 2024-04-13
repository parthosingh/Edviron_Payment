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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        const { amount, callbackUrl, jwt, webHook, clientId, clientSecret, disabled_modes, additional_data, school_id, trustee_id, } = body;
=======
=======
>>>>>>> 67f724c (add dist)
=======
>>>>>>> 4635644 (add type)
<<<<<<< HEAD
        const { amount, callbackUrl, jwt, webHook, clientId, clientSecret, disabled_modes, additional_data, student_id, student_email, student_name, student_phone, student_receipt, school_id, trustee_id, } = body;
>>>>>>> a1ec662 (adding MDR)
        console.log('additional data', additional_data);
=======
<<<<<<< HEAD
        const { amount, callbackUrl, jwt, webHook, clientId, clientSecret, disabled_modes, } = body;
=======
        const { amount, callbackUrl, jwt, webHook, clientId, clientSecret, disabled_modes, platform_charges } = body;
>>>>>>> d6115c5 (adding MDR)
>>>>>>> 0081548 (adding MDR)
=======
        const { amount, callbackUrl, jwt, webHook, clientId, clientSecret, disabled_modes, platform_charges } = body;
>>>>>>> 324d8cb (add dist)
=======
        const { amount, callbackUrl, jwt, webHook, clientId, clientSecret, disabled_modes, platform_charges, } = body;
>>>>>>> 5d9361b (add type)
        if (!jwt)
            throw new common_1.BadRequestException('JWT not provided');
        if (!amount)
            throw new common_1.BadRequestException('Amount not provided');
        if (!callbackUrl)
            throw new common_1.BadRequestException('Callback url not provided');
        try {
            console.log(disabled_modes);
            let decrypted = _jwt.verify(jwt, process.env.KEY);
            if (JSON.stringify({
                ...JSON.parse(JSON.stringify(decrypted)),
                iat: undefined,
                exp: undefined,
            }) !==
                JSON.stringify({
                    amount,
                    callbackUrl,
                    clientId,
                    clientSecret,
                })) {
                throw new common_1.ForbiddenException('Request forged');
            }
<<<<<<< HEAD
            return (0, sign_1.sign)(await this.collectService.collect(amount, callbackUrl, clientId, clientSecret, school_id, trustee_id, disabled_modes, webHook, additional_data || {}));
=======
<<<<<<< HEAD
            return (0, sign_1.sign)(await this.collectService.collect(amount, callbackUrl, clientId, clientSecret, school_id, trustee_id, disabled_modes, webHook, additional_data || {}, student_id, student_email, student_name, student_phone, student_receipt));
=======
            return (0, sign_1.sign)(await this.collectService.collect(amount, callbackUrl, clientId, clientSecret, platform_charges, webHook, disabled_modes));
>>>>>>> 324d8cb (add dist)
>>>>>>> 67f724c (add dist)
        }
        catch (e) {
            console.log(e);
            if (e.name === 'JsonWebTokenError')
                throw new common_1.UnauthorizedException('JWT invalid');
            throw e;
        }
    }
};
exports.CollectController = CollectController;
__decorate([
    (0, common_1.Post)('/'),
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