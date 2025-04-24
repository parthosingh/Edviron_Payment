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
exports.NttdataController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const nttdata_service_1 = require("./nttdata.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const mongoose_1 = require("mongoose");
let NttdataController = class NttdataController {
    constructor(databaseService, nttdataService) {
        this.databaseService = databaseService;
        this.nttdataService = nttdataService;
    }
    async nttdatapayPayment(req, res) {
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
            if (!request.ntt_data.nttdata_id ||
                !request.ntt_data.nttdata_secret ||
                !request.ntt_data.ntt_atom_token)
                throw new common_1.NotFoundException('Order not found');
            if (req_status.status === collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                return res.send(`
        <script>
          alert('This payment has already been completed.');
          window.location.href = '${process.env.URL}/nttdata/callback?collect_id=${collect_id}';
        </script>
      `);
            }
            const created_at = new Date(req_status.createdAt).getTime();
            const now = Date.now();
            const expiry_duration = 15 * 60 * 1000;
            if (now - created_at > expiry_duration) {
                return res.send(`
        <script>
          alert('The payment session has expired. Please initiate the payment again.');
          window.location.href = '${process.env.URL}/nttdata/callback?collect_id=${collect_id}';
        </script>
      `);
            }
            const additional_data = JSON.parse(request.additional_data);
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            let student_email = additional_data?.student_details?.student_email;
            if (!student_email || !emailRegex.test(student_email)) {
                student_email = 'testemail@email.com';
            }
            const student_phone_no = additional_data?.student_details?.student_phone_no || '8888888888';
            return res.send(`
            <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8" />
                <title>Payment Page</title>
                <script defer>
                    const cdnScript = document.createElement('script');
                    cdnScript.setAttribute('src', 'https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js?v=' + Date.now());
                    document.head.appendChild(cdnScript);
                    function openPay() {
                    const options = {
                        atomTokenId: "${request.ntt_data.ntt_atom_token}",
                        merchId: "${request?.ntt_data.nttdata_id || ''}",
                        custEmail: "${student_email}",
                        custMobile: "${student_phone_no}",
                        returnUrl: "${process.env.URL}/nttdata/callback?collect_id=${collect_id}"
                    };
                     new AtomPaynetz(options, 'uat');
                    }
                    window.onload = () => {
                    setTimeout(openPay, 1000);
                    };
                </script>
                </head>
                    <body>
                    </body>
            </html>
            `);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async handleCallback(req, res) {
        try {
            const { collect_id } = req.query;
            const encRes = req.body.encData;
            const data = JSON.parse(this.nttdataService.decrypt(encRes));
            const [collect_request, collect_req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!collect_request || !collect_req_status)
                throw new common_1.NotFoundException('Order not found');
            collect_request.gateway = collect_request_schema_1.Gateway.EDVIRON_NTTDATA;
            collect_request.ntt_data.ntt_atom_txn_id =
                data?.payInstrument?.payDetails?.atomTxnId;
            await collect_request.save();
            const status = await this.nttdataService.getTransactionStatus(collect_id);
            const payment_status = status.status;
            if (payment_status === collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                collect_req_status.status = collect_req_status_schema_1.PaymentStatus.SUCCESS;
                await collect_req_status.save();
            }
            if (collect_request.sdkPayment) {
                const redirectBase = process.env.PG_FRONTEND;
                const route = payment_status === collect_req_status_schema_1.PaymentStatus.SUCCESS
                    ? 'payment-success'
                    : 'payment-failure';
                return res.redirect(`${redirectBase}/${route}?collect_id=${collect_id}`);
            }
            const callbackUrl = new URL(collect_request.callbackUrl);
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
            if (payment_status !== collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                callbackUrl.searchParams.set('status', 'FAILED');
                callbackUrl.searchParams.set('reason', 'Payment-failed');
                return res.redirect(callbackUrl.toString());
            }
            callbackUrl.searchParams.set('status', 'SUCCESS');
            return res.redirect(callbackUrl.toString());
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
    async handleCallbackGet(req, res) {
        try {
            const { collect_id } = req.query;
            const encRes = req.body.encData;
            const data = JSON.parse(this.nttdataService.decrypt(encRes));
            const [collect_request, collect_req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!collect_request || !collect_req_status)
                throw new common_1.NotFoundException('Order not found');
            collect_request.gateway = collect_request_schema_1.Gateway.EDVIRON_NTTDATA;
            collect_request.ntt_data.ntt_atom_txn_id =
                data?.payInstrument?.payDetails?.atomTxnId;
            await collect_request.save();
            const status = await this.nttdataService.getTransactionStatus(collect_id);
            const payment_status = status.status;
            if (payment_status === collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                collect_req_status.status = collect_req_status_schema_1.PaymentStatus.SUCCESS;
                await collect_req_status.save();
            }
            if (collect_request.sdkPayment) {
                const redirectBase = process.env.PG_FRONTEND;
                const route = payment_status === collect_req_status_schema_1.PaymentStatus.SUCCESS
                    ? 'payment-success'
                    : 'payment-failure';
                return res.redirect(`${redirectBase}/${route}?collect_id=${collect_id}`);
            }
            const callbackUrl = new URL(collect_request.callbackUrl);
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
            if (payment_status !== collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                callbackUrl.searchParams.set('status', 'FAILED');
                callbackUrl.searchParams.set('reason', 'Payment-failed');
                return res.redirect(callbackUrl.toString());
            }
            callbackUrl.searchParams.set('status', 'SUCCESS');
            return res.redirect(callbackUrl.toString());
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
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
exports.NttdataController = NttdataController;
__decorate([
    (0, common_1.Get)('/redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NttdataController.prototype, "nttdatapayPayment", null);
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NttdataController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NttdataController.prototype, "handleCallbackGet", null);
__decorate([
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NttdataController.prototype, "handleWebhook", null);
exports.NttdataController = NttdataController = __decorate([
    (0, common_1.Controller)('nttdata'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        nttdata_service_1.NttdataService])
], NttdataController);
//# sourceMappingURL=nttdata.controller.js.map