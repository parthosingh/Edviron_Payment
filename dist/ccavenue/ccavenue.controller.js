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
exports.CcavenueController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const ccavenue_service_1 = require("./ccavenue.service");
const mongoose_1 = require("mongoose");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const sign_1 = require("../utils/sign");
const axios_1 = require("axios");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
let CcavenueController = class CcavenueController {
    constructor(ccavenueService, databaseService) {
        this.ccavenueService = ccavenueService;
        this.databaseService = databaseService;
    }
    async handleRedirect(req, res) {
        res.send(`<form method="post" name="redirect"
                    action="https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"/>
                    <input type="hidden" id="encRequest" name="encRequest" value="${req.query.encRequest}">
                    <input type="hidden" name="access_code" id="access_code" value="${req.query.access_code}">
                </form>
                
                <script type="text/javascript">
                    window.onload = function(){
                        document.forms['redirect'].submit();
                    }
                </script>`);
    }
    async handleCallback(body, res, req) {
        console.log('callback recived from ccavenue');
        console.log(req.query.collect_id);
        const collectIdObject = req.query.collect_id;
        const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
        if (!collectReq)
            throw new Error('Collect request not found');
        collectReq.gateway = collect_request_schema_1.Gateway.EDVIRON_CCAVENUE;
        await collectReq.save();
        const status = await this.ccavenueService.checkStatus(collectReq, collectIdObject);
        console.log(status, 'status ccavenye');
        const orderDetails = JSON.parse(status.decrypt_res);
        console.log(`order details new ${orderDetails.Order_Status_Result}`);
        console.log(`order details new ${orderDetails.Order_Status_Result.order_status}`);
        const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: new mongoose_1.Types.ObjectId(req.query.collect_id),
        });
        if (pendingCollectReq &&
            pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
            console.log('No pending request found for', req.query.collect_id);
            res.status(200).send('OK');
            return;
        }
        const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
            collect_id: collectIdObject,
        }, {
            $set: {
                status: status.status,
                transaction_amount: orderDetails.Order_Status_Result.order_gross_amt,
                payment_method: orderDetails.Order_Status_Result.order_option_type,
                details: JSON.stringify(orderDetails),
                bank_reference: orderDetails.Order_Status_Result.order_bank_ref_no,
            },
        }, {
            upsert: true,
            new: true,
        });
        const webHookUrl = collectReq?.webHookUrl;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collectIdObject);
        const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        if (!collectRequest) {
            throw new Error(`transaction not found`);
        }
        const custom_order_id = collectRequest?.custom_order_id || '';
        if (webHookUrl !== null) {
            const amount = orderDetails.Order_Status_Result.order_amt;
            const webHookData = await (0, sign_1.sign)({
                collect_id: req.query.collect_id,
                amount,
                status: status.status,
                trustee_id: collectReq.trustee_id,
                school_id: collectReq.school_id,
                req_webhook_urls: collectReq?.req_webhook_urls,
                custom_order_id,
                createdAt: collectRequestStatus?.createdAt,
                transaction_time: collectRequestStatus?.updatedAt,
            });
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${webHookUrl}`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
                data: webHookData,
            };
            try {
                const webHookSent = await axios_1.default.request(config);
                console.log(`webhook sent to ${webHookUrl} with data ${webHookSent}`);
            }
            catch (e) {
                console.log(` failed to send webhook to ${webHookUrl} reason ${e.message}`);
            }
        }
        const { encResp } = body;
        const collectRequestId = await this.ccavenueService.ccavResponseToCollectRequestId(encResp, collectRequest.ccavenue_working_key);
        res.redirect(collectRequest?.callbackUrl);
    }
};
exports.CcavenueController = CcavenueController;
__decorate([
    (0, common_1.Get)('/redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CcavenueController.prototype, "handleRedirect", null);
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CcavenueController.prototype, "handleCallback", null);
exports.CcavenueController = CcavenueController = __decorate([
    (0, common_1.Controller)('ccavenue'),
    __metadata("design:paramtypes", [ccavenue_service_1.CcavenueService,
        database_service_1.DatabaseService])
], CcavenueController);
//# sourceMappingURL=ccavenue.controller.js.map