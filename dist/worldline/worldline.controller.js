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
exports.WorldlineController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const database_service_1 = require("../database/database.service");
const worldline_service_1 = require("./worldline.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
let WorldlineController = class WorldlineController {
    constructor(databaseService, worldlineService) {
        this.databaseService = databaseService;
        this.worldlineService = worldlineService;
    }
    async worldlinePayment(req, res) {
        try {
            const { collect_id } = req.query;
            const [request, req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!request || !req_status)
                throw new common_1.NotFoundException('Order not found');
            if (!request.worldline.worldline_merchant_id || !request.worldline_token)
                throw new common_1.NotFoundException('Order not found');
            const additional_data = JSON.parse(request.additional_data);
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            let student_email = additional_data?.student_details?.student_email;
            if (!student_email || !emailRegex.test(student_email)) {
                student_email = 'testemail@email.com';
            }
            const student_phone_no = additional_data?.student_details?.student_phone_no || '8888888888';
            const formattedAmount = Math.round(parseFloat(request.amount.toString()) * 100) / 100;
            const token = request.worldline_token.toString();
            return res.send(`
        <!doctype html>
        <html>
        <head>
          <title>Checkout Auto-Load</title>
          <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1" />
          <script src="https://www.paynimo.com/paynimocheckout/client/lib/jquery.min.js"></script>
        </head>
        <body>
          <script src="https://www.paynimo.com/paynimocheckout/server/lib/checkout.js"></script>
          <script>
            $(document).ready(function () {
              function handleResponse(res) {
                if (
                  res &&
                  res.paymentMethod &&
                  res.paymentMethod.paymentTransaction &&
                  res.paymentMethod.paymentTransaction.statusCode
                ) {
                  var statusCode = res.paymentMethod.paymentTransaction.statusCode;
                  var statusMessage = res.paymentMethod.paymentTransaction.statusMessage;
        
                  if (statusCode === "0300") {
                    console.log("Payment Success");
                  } else if (statusCode === "0398") {
                    console.log("Payment Initiated");
                  } else {
                    console.error("Payment Error - Status Code:", statusCode);
                    console.error("Payment Error - Message:", statusMessage || "No status message provided.");
                  }
                } else {
                  console.error("Invalid response format:", res);
                }
              }
        
              var reqJson = {
                features: {
                  enableAbortResponse: true,
                  enableExpressPay: true,
                  enableInstrumentDeRegistration: true,
                  enableMerTxnDetails: true
                },
                consumerData: {
                  deviceId: "WEBSH2",
                  token: "${token}",
                  returnUrl: "${process.env.URL}/worldline/callback/?collect_id=${collect_id}",
                  responseHandler: handleResponse,
                  paymentMode: "ALL",
                  merchantId: "${request.worldline.worldline_merchant_id}",
                  currency: "INR",
                  txnId: "${request._id}",
                  items: [{
                    itemId: "first",
                    amount: ${formattedAmount},
                    comAmt: "0"
                  }]
                }
              };
        
              $.pnCheckout(reqJson);
              if (reqJson.features.enableNewWindowFlow) {
                pnCheckoutShared.openNewWindow();
              }
            });
          </script>
        </body>
        </html>
        `);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async handleCallbackPost(req, res) {
        const { collect_id } = req.query;
        const msg = req.body.msg;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Error in collect request');
        }
        const decryptMessage = await this.worldlineService.decryptAES256Hex(msg, collectRequest.worldline.worldline_encryption_key, collectRequest.worldline.worldline_encryption_iV);
        const parsedMessage = JSON.parse(decryptMessage);
        let status = parsedMessage?.paymentMethod?.paymentTransaction?.statusMessage || "";
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_WORLDLINE;
        await collectRequest.save();
        let detail = null;
        let paymentMethod = null;
        switch (parsedMessage?.paymentMethod?.paymentMode) {
            case 'UPI':
                detail = parsedMessage?.paymentMethod?.paymentTransaction?.upiTransactionDetails;
                paymentMethod = 'UPI';
                break;
            case 'CARD':
                detail = parsedMessage?.paymentMethod?.paymentTransaction?.cardDetails;
                paymentMethod = 'Card';
                break;
            case 'Netbanking':
                detail = {
                    netbanking: {
                        channel: parsedMessage?.paymentMethod?.instrumentAliasName || null,
                        netbanking_bank_code: parsedMessage?.paymentMethod?.bankSelectionCode || null,
                        netbanking_bank_name: parsedMessage?.paymentMethod?.paymentTransaction?.bankName || null,
                    },
                };
                paymentMethod = 'netbanking';
                break;
            case 'WALLET':
                detail = parsedMessage?.paymentMethod?.paymentTransaction?.walletTransactionDetails;
                paymentMethod = 'Wallet';
                break;
            default:
                detail = null;
                paymentMethod = 'Unknown';
                break;
        }
        const collectStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collect_id,
        });
        if (!collectStatus) {
            throw new common_1.BadRequestException('Collect request status not found');
        }
        const paymentTime = parsedMessage?.paymentMethod?.paymentTransaction?.dateTime || null;
        collectStatus.payment_method = paymentMethod;
        collectStatus.status = status.toUpperCase() === 'SUCCESS' ? collect_req_status_schema_1.PaymentStatus.SUCCESS : collect_req_status_schema_1.PaymentStatus.PENDING;
        collectStatus.bank_reference = parsedMessage?.paymentMethod?.paymentTransaction?.reference || '';
        collectStatus.payment_time = paymentTime ? (() => {
            const [datePart, timePart] = paymentTime.split(' ');
            const [day, month, year] = datePart.split('-');
            const [hours, minutes, seconds] = timePart.split(':');
            return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)));
        })() : new Date();
        collectStatus.details = JSON.stringify(detail);
        await collectStatus.save();
        if (collectRequest?.sdkPayment) {
            if (status.toUpperCase() === `SUCCESS`) {
                console.log(`SDK payment success for ${collect_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`);
            }
            ;
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`);
        }
        const callbackUrl = new URL(collectRequest.callbackUrl);
        if (status.toUpperCase() !== `SUCCESS`) {
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async handleCallbackRest(req, res) {
        const { collect_id } = req.query;
        const msg = req.body.msg;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Error in collect request');
        }
        const decryptMessage = await this.worldlineService.decryptAES256Hex(msg, collectRequest.worldline.worldline_encryption_key, collectRequest.worldline.worldline_encryption_iV);
        const parsedMessage = JSON.parse(decryptMessage);
        console.log(parsedMessage);
        let status = parsedMessage?.paymentMethod?.paymentTransaction?.statusMessage || "";
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_WORLDLINE;
        await collectRequest.save();
        let detail = null;
        let paymentMethod = null;
        switch (parsedMessage?.paymentMethod?.paymentMode) {
            case 'UPI':
                detail = parsedMessage?.paymentMethod?.paymentTransaction?.upiTransactionDetails;
                paymentMethod = 'UPI';
                break;
            case 'CARD':
                detail = parsedMessage?.paymentMethod?.paymentTransaction?.cardDetails;
                paymentMethod = 'Card';
                break;
            case 'Netbanking':
                detail = {
                    netbanking: {
                        channel: parsedMessage?.paymentMethod?.instrumentAliasName || null,
                        netbanking_bank_code: parsedMessage?.paymentMethod?.bankSelectionCode || null,
                        netbanking_bank_name: parsedMessage?.paymentMethod?.paymentTransaction?.bankName || null,
                    },
                };
                paymentMethod = 'netbanking';
                break;
            case 'WALLET':
                detail = parsedMessage?.paymentMethod?.paymentTransaction?.walletTransactionDetails;
                paymentMethod = 'Wallet';
                break;
            default:
                detail = null;
                paymentMethod = 'Unknown';
                break;
        }
        const collectStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collect_id,
        });
        if (!collectStatus) {
            throw new common_1.BadRequestException('Collect request status not found');
        }
        const paymentTime = parsedMessage?.paymentMethod?.paymentTransaction?.dateTime || null;
        collectStatus.payment_method = paymentMethod;
        collectStatus.status = status.toUpperCase() === 'SUCCESS' ? collect_req_status_schema_1.PaymentStatus.SUCCESS : collect_req_status_schema_1.PaymentStatus.PENDING;
        collectStatus.bank_reference = parsedMessage?.paymentMethod?.paymentTransaction?.reference || '';
        collectStatus.payment_time = paymentTime ? (() => {
            const [datePart, timePart] = paymentTime.split(' ');
            const [day, month, year] = datePart.split('-');
            const [hours, minutes, seconds] = timePart.split(':');
            return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)));
        })() : new Date();
        collectStatus.details = JSON.stringify(detail);
        await collectStatus.save();
        if (collectRequest?.sdkPayment) {
            if (status.toUpperCase() === `SUCCESS`) {
                console.log(`SDK payment success for ${collect_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`);
            }
            ;
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`);
        }
        const callbackUrl = new URL(collectRequest.callbackUrl);
        if (status.toUpperCase() !== `SUCCESS`) {
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async handleWebhook(req, res) {
        try {
            const stringified_data = JSON.stringify(req.body);
            await this.databaseService.WebhooksModel.create({
                body: stringified_data,
            });
            return res.sendStatus(200);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
};
exports.WorldlineController = WorldlineController;
__decorate([
    (0, common_1.Get)('redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorldlineController.prototype, "worldlinePayment", null);
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorldlineController.prototype, "handleCallbackPost", null);
__decorate([
    (0, common_1.Post)('/rest/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorldlineController.prototype, "handleCallbackRest", null);
__decorate([
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorldlineController.prototype, "handleWebhook", null);
exports.WorldlineController = WorldlineController = __decorate([
    (0, common_1.Controller)('worldline'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        worldline_service_1.WorldlineService])
], WorldlineController);
//# sourceMappingURL=worldline.controller.js.map