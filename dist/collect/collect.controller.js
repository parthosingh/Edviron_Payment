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
const database_service_1 = require("../database/database.service");
let CollectController = class CollectController {
    constructor(collectService, databaseService) {
        this.collectService = collectService;
        this.databaseService = databaseService;
    }
    async collect(body) {
        const { amount, callbackUrl, jwt, webHook, clientId, clientSecret, disabled_modes, platform_charges, additional_data, school_id, trustee_id, custom_order_id, req_webhook_urls, school_name, easebuzz_sub_merchant_id, ccavenue_access_code, ccavenue_working_key, ccavenue_merchant_id, smartgateway_merchant_id, smartgateway_customer_id, smart_gateway_api_key, split_payments, vendors_info, pay_u_key, pay_u_salt, hdfc_razorpay_id, hdfc_razorpay_secret, hdfc_razorpay_mid, nttdata_id, nttdata_secret, nttdata_hash_req_key, nttdata_hash_res_key, nttdata_res_salt, nttdata_req_salt, isVBAPayment, worldline_merchant_id, worldline_encryption_key, worldline_encryption_iV, worldline_scheme_code, vba_account_number } = body;
        if (!jwt)
            throw new common_1.BadRequestException('JWT not provided');
        if (!amount)
            throw new common_1.BadRequestException('Amount not provided');
        if (!callbackUrl)
            throw new common_1.BadRequestException('Callback url not provided');
        try {
            console.log(disabled_modes);
            let decrypted = _jwt.verify(jwt, process.env.KEY);
            console.log(decrypted);
            return (0, sign_1.sign)(await this.collectService.collect(amount, callbackUrl, school_id, trustee_id, disabled_modes, platform_charges, clientId, clientSecret, webHook, additional_data || {}, custom_order_id, req_webhook_urls, school_name, easebuzz_sub_merchant_id, ccavenue_merchant_id, ccavenue_access_code, ccavenue_working_key, smartgateway_customer_id, smartgateway_merchant_id, smart_gateway_api_key, split_payments || false, pay_u_key, pay_u_salt, hdfc_razorpay_id, hdfc_razorpay_secret, hdfc_razorpay_mid, nttdata_id, nttdata_secret, nttdata_hash_req_key, nttdata_hash_res_key, nttdata_res_salt, nttdata_req_salt, worldline_merchant_id, worldline_encryption_key, worldline_encryption_iV, worldline_scheme_code, vendors_info, isVBAPayment, vba_account_number));
        }
        catch (e) {
            console.log(e);
            if (e.name === 'JsonWebTokenError')
                throw new common_1.UnauthorizedException('JWT invalid');
            throw e;
        }
    }
    async posCollect(body) {
        const { amount, callbackUrl, jwt, school_id, trustee_id, machine_name, paytm_pos, platform_charges, additional_data, custom_order_id, req_webhook_urls, school_name, } = body;
        if (!jwt)
            throw new common_1.BadRequestException('JWT not provided');
        if (!amount)
            throw new common_1.BadRequestException('Amount not provided');
        if (!callbackUrl)
            throw new common_1.BadRequestException('Callback url not provided');
        try {
            let decrypted = _jwt.verify(jwt, process.env.KEY);
            console.log(decrypted, 'decrypted pos collect');
            return (0, sign_1.sign)(await this.collectService.posCollect(amount, callbackUrl, school_id, trustee_id, machine_name, platform_charges, paytm_pos, additional_data, custom_order_id, req_webhook_urls, school_name));
        }
        catch (e) {
            console.log(e);
            if (e.name === 'JsonWebTokenError')
                throw new common_1.UnauthorizedException('JWT invalid');
            throw e;
        }
    }
    async callbackUrl(res, collect_id) {
        const collect_request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collect_request) {
            throw new common_1.BadRequestException('tranaction missing');
        }
        let callbackUrl = new URL(collect_request.callbackUrl);
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
        callbackUrl.searchParams.set('status', 'cancelled');
        callbackUrl.searchParams.set('reason', 'dropped-by-user');
        res.redirect(callbackUrl.toString());
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
__decorate([
    (0, common_1.Post)('/pos'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CollectController.prototype, "posCollect", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CollectController.prototype, "callbackUrl", null);
exports.CollectController = CollectController = __decorate([
    (0, common_1.Controller)('collect'),
    __metadata("design:paramtypes", [collect_service_1.CollectService,
        database_service_1.DatabaseService])
], CollectController);
//# sourceMappingURL=collect.controller.js.map