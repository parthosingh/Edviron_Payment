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
exports.RazorpayController = void 0;
const common_1 = require("@nestjs/common");
const razorpay_service_1 = require("./razorpay.service");
const database_service_1 = require("../database/database.service");
const _jwt = require("jsonwebtoken");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
let RazorpayController = class RazorpayController {
    constructor(razorpayService, databaseService) {
        this.razorpayService = razorpayService;
        this.databaseService = databaseService;
    }
    async handleCallback(body, collect_id, res) {
        try {
            const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, } = body;
            const isValid = this.razorpayService.verifySignature(orderId, paymentId, signature);
            if (!isValid)
                throw new common_1.BadRequestException('Invalid Signature');
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest)
                throw new common_1.BadRequestException('Order Id not found');
            collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_RAZORPAY;
            collectRequest.paymentIds.razorpay_order_id = orderId;
            collectRequest.razorpay_seamless.payment_id = paymentId;
            await collectRequest.save();
            const paymentStatus = await this.razorpayService.checkPaymentStatus(paymentId, collectRequest);
            if (collectRequest.sdkPayment) {
                if (paymentStatus.status === 'SUCCESS') {
                    return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collectRequest._id}`);
                }
                return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collectRequest._id}`);
            }
            const callbackUrl = new URL(collectRequest?.callbackUrl);
            if (paymentStatus.status !== `SUCCESS`) {
                callbackUrl.searchParams.set('EdvironCollectRequestId', collectRequest._id.toString());
                callbackUrl.searchParams.set('status', paymentStatus.status);
                return res.redirect(callbackUrl.toString());
            }
            callbackUrl.searchParams.set('EdvironCollectRequestId', collectRequest._id.toString());
            callbackUrl.searchParams.set('status', paymentStatus.status);
            callbackUrl.searchParams.set('reason', paymentStatus.error_reason);
            return res.redirect(callbackUrl.toString());
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async getDispute(collect_id, dispute_id, token) {
        try {
            const decoded = _jwt.verify(token, process.env.KEY);
            if (decoded.collect_id !== collect_id) {
                throw new common_1.BadRequestException('Invalid token');
            }
            const collecRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collecRequest)
                throw new common_1.BadRequestException('Collect Request not found');
            const data = await this.razorpayService.getDispute(dispute_id, collecRequest.razorpay_seamless.razorpay_mid, collecRequest);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
};
exports.RazorpayController = RazorpayController;
__decorate([
    (0, common_1.Post)('/callback/:collect_id'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('collect_id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RazorpayController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('/get-dispute'),
    __param(0, (0, common_1.Query)('collect_id')),
    __param(1, (0, common_1.Query)('dispute_id')),
    __param(2, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RazorpayController.prototype, "getDispute", null);
exports.RazorpayController = RazorpayController = __decorate([
    (0, common_1.Controller)('razorpay'),
    __metadata("design:paramtypes", [razorpay_service_1.RazorpayService,
        database_service_1.DatabaseService])
], RazorpayController);
//# sourceMappingURL=razorpay.controller.js.map