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
exports.EasebuzzController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const sign_1 = require("../utils/sign");
const sign_2 = require("../utils/sign");
let EasebuzzController = class EasebuzzController {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async getQr(res, req) {
        try {
            const collect_id = req.query.collect_id;
            if (!collect_id) {
                throw new common_1.NotFoundException('collect_id not found');
            }
            const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id).select('deepLink');
            if (!collectReq) {
                throw new common_1.NotFoundException('Collect request not found');
            }
            return res.send(collectReq.deepLink);
        }
        catch (error) {
            console.log(error);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getEncryptedInfo(res, req, body) {
        const { card_number, card_holder, card_cvv, card_exp } = req.query;
        console.log('encrypting key and iv');
        const { key, iv } = await (0, sign_1.merchantKeySHA256)();
        console.log('key and iv generated', { key, iv });
        console.log(`encrypting data: ${card_number}`);
        const enc_card_number = await (0, sign_2.encryptCard)(card_number, key, iv);
        const enc_card_holder = await (0, sign_2.encryptCard)(card_holder, key, iv);
        const enc_card_cvv = await (0, sign_2.encryptCard)(card_cvv, key, iv);
        const enc_card_exp = await (0, sign_2.encryptCard)(card_exp, key, iv);
        const decrypt_card_number = await (0, sign_1.decrypt)(enc_card_number, key, iv);
        const decrypt_cvv = await (0, sign_1.decrypt)(enc_card_cvv, key, iv);
        const decrypt_exp = await (0, sign_1.decrypt)(enc_card_exp, key, iv);
        const decrypt_card_holder_name = await (0, sign_1.decrypt)(enc_card_holder, key, iv);
        console.log(decrypt_card_holder_name, decrypt_cvv, decrypt_card_number, decrypt_exp);
        return res.send({
            card_number: enc_card_number,
            card_holder: enc_card_holder,
            card_cvv: enc_card_cvv,
            card_exp: enc_card_exp,
        });
    }
};
exports.EasebuzzController = EasebuzzController;
__decorate([
    (0, common_1.Get)('/upiqr'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getQr", null);
__decorate([
    (0, common_1.Get)('/encrypted-info'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getEncryptedInfo", null);
exports.EasebuzzController = EasebuzzController = __decorate([
    (0, common_1.Controller)('easebuzz'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EasebuzzController);
//# sourceMappingURL=easebuzz.controller.js.map