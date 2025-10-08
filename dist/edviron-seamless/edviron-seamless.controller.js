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
exports.EdvironSeamlessController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
const edviron_seamless_service_1 = require("./edviron-seamless.service");
let EdvironSeamlessController = class EdvironSeamlessController {
    constructor(easebuzzService, databaseService, edvironSeamlessService) {
        this.easebuzzService = easebuzzService;
        this.databaseService = databaseService;
        this.edvironSeamlessService = edvironSeamlessService;
    }
    async initiatePayment(body, res) {
        try {
            const { school_id, trustee_id, token, mode, collect_id, net_banking, card, wallet, pay_later, upi } = body;
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.BadRequestException('Invalid Collect Id');
            }
            if (request?.school_id !== school_id || request.trustee_id !== trustee_id) {
                throw new common_1.BadRequestException("Unauthorized Access");
            }
            const access_key = request.paymentIds.easebuzz_id;
            if (mode === 'NB') {
                if (!net_banking ||
                    !net_banking.bank_code) {
                    throw new common_1.BadRequestException('Required Parameter Missing');
                }
                const url = `${process.env.PG_FRONTEND}/seamless-pay/?mode=NB&school_id=${school_id}&access_key=${access_key}&mode=NB&code=${net_banking.bank_code}`;
                return res.send({ url });
            }
            else if (mode === "CC" || mode === "DC") {
                const { enc_card_number, enc_card_holder_name, enc_card_cvv, enc_card_expiry_date, } = card;
                const cardInfo = await this.edvironSeamlessService.processcards(enc_card_number, enc_card_holder_name, enc_card_cvv, enc_card_expiry_date, school_id, collect_id);
                const url = `${process.env.PG_FRONTEND}/seamless-pay?mode=${mode}&enc_card_number=${cardInfo.card_number}&enc_card_holder_name=${cardInfo.card_holder}&enc_card_cvv=${cardInfo.card_cvv}&enc_card_exp=${cardInfo.card_exp}&access_key=${access_key}`;
                return res.send({ url });
            }
            else if (mode === "WALLET") {
                if (!wallet || !wallet.bank_code) {
                    throw new common_1.BadRequestException("Wallet bank code Required");
                }
                const url = `${process.env.PG_FRONTEND}/seamless-pay?mode=MW&bank_code=${wallet.bank_code}&access_key=${access_key}`;
                return res.send({ url });
            }
            else if (mode === "PAY_LATER") {
                if (!pay_later || !pay_later.bank_code) {
                    throw new common_1.BadRequestException("Pay Later bank code Required");
                }
                const url = `${process.env.PG_FRONTEND}/seamless-pay?mode=PL&bank_code=${pay_later.bank_code}&access_key=${access_key}`;
                return res.send({ url });
            }
            else if (mode === "UPI") {
                if (upi.mode === 'QR') {
                    const upiRes = await this.easebuzzService.getQrBase64(collect_id);
                    return res.send({
                        mode: "VPA",
                        upiRes
                    });
                }
                else if (upi.mode === "VPA") {
                    const url = `${process.env.PG_FRONTEND}/seamless-pay?mode=${mode}&vpa=${upi.vpa}&access_key=${access_key}`;
                    return res.send({ url });
                }
            }
            else {
                throw new common_1.BadRequestException("Invalid Mode ");
            }
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async testNB(req, res) {
        try {
            const { collect_id, bank_code } = req.query;
            const response = await this.easebuzzService.netBankingSeamless(collect_id, bank_code);
            return res.send(response);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.EdvironSeamlessController = EdvironSeamlessController;
__decorate([
    (0, common_1.Post)('/initiate-payment'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironSeamlessController.prototype, "initiatePayment", null);
__decorate([
    (0, common_1.Get)('/test-nb'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironSeamlessController.prototype, "testNB", null);
exports.EdvironSeamlessController = EdvironSeamlessController = __decorate([
    (0, common_1.Controller)('edviron-seamless'),
    __metadata("design:paramtypes", [easebuzz_service_1.EasebuzzService,
        database_service_1.DatabaseService,
        edviron_seamless_service_1.EdvironSeamlessService])
], EdvironSeamlessController);
//# sourceMappingURL=edviron-seamless.controller.js.map