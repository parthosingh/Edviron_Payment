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
exports.EdvironSeamlessService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const jwt = require("jsonwebtoken");
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
const sign_1 = require("../utils/sign");
let EdvironSeamlessService = class EdvironSeamlessService {
    constructor(easebuzzService) {
        this.easebuzzService = easebuzzService;
    }
    async processcards(enc_card_number, enc_card_holder_name, enc_card_cvv, enc_card_expiry_date, school_id, collect_id) {
        try {
            console.log("debug");
            const sign = jwt.sign({ school_id }, process.env.KEY);
            const config = {
                method: 'get',
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-key-iv?school_id=${school_id}&sign=${sign}`,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            };
            const { data: info } = await axios_1.default.request(config);
            console.log(info, 'info');
            const { key, iv } = info;
            const card_number = await (0, sign_1.decrypt)(enc_card_number, key, iv);
            const card_holder_name = await (0, sign_1.decrypt)(enc_card_holder_name, key, iv);
            const card_cvv = await (0, sign_1.decrypt)(enc_card_cvv, key, iv);
            const card_expiry_date = await (0, sign_1.decrypt)(enc_card_expiry_date, key, iv);
            return await this.easebuzzService.easebuzzEncryption(card_number, card_holder_name, card_cvv, card_expiry_date, collect_id);
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.EdvironSeamlessService = EdvironSeamlessService;
exports.EdvironSeamlessService = EdvironSeamlessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [easebuzz_service_1.EasebuzzService])
], EdvironSeamlessService);
//# sourceMappingURL=edviron-seamless.service.js.map