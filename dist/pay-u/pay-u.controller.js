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
exports.PayUController = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const qs = require("qs");
const pay_u_service_1 = require("./pay-u.service");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
let PayUController = class PayUController {
    constructor(payUService, databaseService) {
        this.payUService = payUService;
        this.databaseService = databaseService;
    }
    async testPayment() {
        try {
            const url = 'https://test.payu.in/_payment';
            const headers = {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: 'ePBfYcIbiJPsAyduYb3rPre11uRvaI7a; PHPSESSID=gdtsmpkbmilsv9beouqc1t10u4',
            };
            const data = qs.stringify({
                key: 'BuxMPz',
                txnid: '123456789',
                amount: '10.00',
                firstname: 'raj',
                email: 'test@gmail.com',
                phone: '9876543210',
                productinfo: 'iPhone',
                pg: 'NB',
                bankcode: 'TESTPGNB',
                surl: 'https://apiplayground-response.herokuapp.com/',
                furl: 'https://apiplayground-response.herokuapp.com/',
                hash: 'fc9d296e94e641ad711817a85dc3eab17b2660d4c411e1e5972131819d81c68411ac50c230f56795d2e393691811a2e17a1c8a39d6d51c050197c0a85b810318',
            });
            const response = await axios_1.default.post(url, data, { headers });
            return response.data;
        }
        catch (error) {
            throw new Error(`Payment request failed: ${error.message}`);
        }
    }
    async redirectPayu(req, res) {
        const collect_id = req.query.collect_id;
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new common_1.ConflictException('url fordge');
        }
        const hash = await this.payUService.generate512HASH(request.pay_u_key, collect_id, request.amount, request.pay_u_salt);
        res.send(`<form action="https://secure.payu.in/_payment" method="post" name="redirect">
      <input type="hidden" name="key" value="${request.pay_u_key}" />
      <input type="hidden" name="txnid" value="${collect_id}" />
      <input type="hidden" name="productinfo" value="school_fee" />
      <input type="hidden" name="amount" value="${request.amount}" />
      <input type="hidden" name="email" value="noreply@edviron.com" />
      <input type="hidden" name="firstname" value="edviron" />
      <input type="hidden" name="lastname" value="edviron" />
      <input type="hidden" name="surl" value="${process.env.URL}/pay-u/callback/?collect_id=${collect_id}" />
      <input type="hidden" name="furl" value="${process.env.URL}/pay-u/callback/?collect_id=${collect_id}" />
      <input type="hidden" name="phone" value="0000000000" />
      <input type="hidden" name="hash" value="${hash}" />
    </form>
    <script type="text/javascript">
                      window.onload = function(){
                          document.forms['redirect'].submit();
                      }
                  </script>`);
    }
    async testUpi() {
        try {
            const url = 'https://secure.payu.in/_payment';
            const headers = {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: 'ePBfYcIbiJPsAyduYb3rPre11uRvaI7a; PHPSESSID=gdtsmpkbmilsv9beouqc1t10u4',
            };
            const data = qs.stringify({
                key: 'BuxMPz',
                txnid: '123456789',
                amount: '10.00',
                firstname: 'raj',
                email: 'test@gmail.com',
                phone: '9876543210',
                productinfo: 'iPhone',
                pg: 'UPI',
                bankcode: 'UPI',
                vpa: 'kk@okaxis',
                surl: 'https://apiplayground-response.herokuapp.com/',
                furl: 'https://apiplayground-response.herokuapp.com/',
                hash: 'fc9d296e94e641ad711817a85dc3eab17b2660d4c411e1e5972131819d81c68411ac50c230f56795d2e393691811a2e17a1c8a39d6d51c050197c0a85b810318',
            });
            const response = await axios_1.default.post(url, data, { headers });
            return response.data;
        }
        catch (error) {
            throw new Error(`Payment request failed: ${error.message}`);
        }
    }
    async handleCallback(req, res) {
        const { collect_id } = req.query;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Error in collect request');
        }
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_PAY_U;
        await collectRequest.save();
        const { status } = await this.payUService.checkStatus(collect_id);
        if (collectRequest?.sdkPayment) {
            if (status === `SUCCESS`) {
                console.log(`SDK payment success for ${collect_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`);
            }
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`);
        }
        const callbackUrl = new URL(collectRequest.callbackUrl);
        if (status !== `SUCCESS`) {
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async handleCallbackPost(req, res) {
        const { collect_id } = req.query;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Error in collect request');
        }
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_PAY_U;
        await collectRequest.save();
        const { status } = await this.payUService.checkStatus(collect_id);
        if (collectRequest?.sdkPayment) {
            if (status === `SUCCESS`) {
                console.log(`SDK payment success for ${collect_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`);
            }
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`);
        }
        const callbackUrl = new URL(collectRequest.callbackUrl);
        if (status !== `SUCCESS`) {
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async checkStatus(req, res) {
        const collect_id = req.query.collect_id;
        const status = await this.payUService.checkStatus(collect_id);
        res.json(status);
    }
};
exports.PayUController = PayUController;
__decorate([
    (0, common_1.Get)('/nb'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "testPayment", null);
__decorate([
    (0, common_1.Get)('redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "redirectPayu", null);
__decorate([
    (0, common_1.Get)('/upi'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "testUpi", null);
__decorate([
    (0, common_1.Get)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "handleCallbackPost", null);
__decorate([
    (0, common_1.Post)('/check-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "checkStatus", null);
exports.PayUController = PayUController = __decorate([
    (0, common_1.Controller)('pay-u'),
    __metadata("design:paramtypes", [pay_u_service_1.PayUService,
        database_service_1.DatabaseService])
], PayUController);
//# sourceMappingURL=pay-u.controller.js.map