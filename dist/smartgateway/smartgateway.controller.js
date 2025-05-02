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
exports.SmartgatewayController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const smartgateway_service_1 = require("./smartgateway.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const mongoose_1 = require("mongoose");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const jwt = require("jsonwebtoken");
const axios_1 = require("axios");
let SmartgatewayController = class SmartgatewayController {
    constructor(databaseService, smartgatewayService, edvironPgService) {
        this.databaseService = databaseService;
        this.smartgatewayService = smartgatewayService;
        this.edvironPgService = edvironPgService;
    }
    async handleCallback(body, res) {
        const { order_id, sdk_status } = body;
        const info = await this.databaseService.CollectRequestModel.findById(order_id);
        if (!info) {
            throw new Error('transaction not found');
        }
        info.gateway = collect_request_schema_1.Gateway.SMART_GATEWAY;
        await info.save();
        const data = await this.smartgatewayService.checkStatus(order_id, info);
        if (data.amount !== info.amount) {
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${order_id}`);
        }
        if (info.sdkPayment) {
            if (data.status === `SUCCESS`) {
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${order_id}`);
            }
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${order_id}`);
        }
        const callbackUrl = new URL(info?.callbackUrl);
        if (data.status !== `SUCCESS`) {
            callbackUrl.searchParams.set('EdvironCollectRequestId', order_id);
            callbackUrl.searchParams.set('status', data.status);
            callbackUrl.searchParams.set('reason', sdk_status);
            return res.redirect(callbackUrl.toString());
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', order_id);
        callbackUrl.searchParams.set('status', data.status);
        return res.redirect(callbackUrl.toString());
    }
    async handleCallbackGet(body, res) {
        const { order_id, sdk_status } = body;
        const info = await this.databaseService.CollectRequestModel.findById(order_id);
        if (!info) {
            throw new Error('transaction not found');
        }
        info.gateway = collect_request_schema_1.Gateway.SMART_GATEWAY;
        await info.save();
        const data = await this.smartgatewayService.checkStatus(order_id, info);
        if (data.amount !== info.amount) {
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${order_id}`);
        }
        if (info.sdkPayment) {
            if (data.status === `SUCCESS`) {
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${order_id}`);
            }
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${order_id}`);
        }
        const callbackUrl = new URL(info?.callbackUrl);
        if (data.status !== `SUCCESS`) {
            callbackUrl.searchParams.set('EdvironCollectRequestId', order_id);
            callbackUrl.searchParams.set('status', data.status);
            callbackUrl.searchParams.set('reason', sdk_status);
            return res.redirect(callbackUrl.toString());
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', order_id);
        callbackUrl.searchParams.set('status', data.status);
        return res.redirect(callbackUrl.toString());
    }
    async webhook(body, res) {
        const { content, txn_detail, date_created } = body;
        const { order_id } = content.order;
        const { order } = body.content;
        try {
            const collect_id = order_id;
            const collectIdObject = new mongoose_1.Types.ObjectId(collect_id);
            const orderDetail = order;
            const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
            if (!collectReq)
                throw new Error('Collect request not found');
            const transaction_amount = orderDetail?.metadata?.payment_page_sdk_payload?.amount || null;
            await new this.databaseService.WebhooksModel({
                collect_id: collectIdObject.toString(),
                body: JSON.stringify(body),
                gateway: 'smartgateway',
            }).save();
            const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            if (pendingCollectReq &&
                pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
                res.status(200).send('OK');
                return;
            }
            const status_response = await this.smartgatewayService.checkStatus(collectReq._id.toString(), collectReq);
            let platform_type;
            let payment_method;
            let details;
            switch (status_response.details.payment_mode) {
                case 'wallet':
                    payment_method = 'walet';
                    platform_type = 'Wallet';
                    details = {
                        app: {
                            channel: status_response.details.payment_methods.wallet.mode,
                            provider: status_response.details.payment_methods.wallet.mode,
                        },
                    };
                    break;
                case 'upi':
                    payment_method = 'upi';
                    platform_type = 'UPI';
                    details = {
                        upi: {
                            upi_id: status_response.details.payment_methods.upi.payer_vpa,
                        },
                    };
                    break;
                case 'net_banking':
                    payment_method = 'net_banking';
                    platform_type = 'NetBanking';
                    details = {
                        netbanking: {
                            netbanking_bank_name: status_response.details.payment_methods.net_banking.payment_method?.substring(2) || '',
                        },
                    };
                    break;
                case 'credit_card':
                    payment_method = 'credit_card';
                    platform_type = 'CreditCard';
                    details = {
                        card: {
                            card_bank_name: status_response.details.payment_methods.card.card_bank_name,
                            provicard_network: status_response.details.payment_methods.card.card_network,
                            card_number: status_response.details.payment_methods.card.card_number,
                            card_type: 'credit_card',
                        },
                    };
                    break;
                case 'debit_card':
                    payment_method = 'debit_card';
                    platform_type = 'DebitCard';
                    details = {
                        card: {
                            card_bank_name: status_response.details.payment_methods.card.card_bank_name,
                            provicard_network: status_response.details.payment_methods.card.card_network,
                            card_number: status_response.details.payment_methods.card.card_number,
                            card_type: 'debit_card',
                        },
                    };
                    break;
                default:
                    payment_method = 'Unknown';
            }
            if (status_response.status === 'SUCCESS') {
                try {
                    const schoolInfo = await this.edvironPgService.getSchoolInfo(collectReq.school_id);
                    const email = schoolInfo.email;
                }
                catch (error) {
                    console.log('error in sending transaction mail ');
                }
                const tokenData = {
                    school_id: collectReq.school_id,
                    trustee_id: collectReq.trustee_id,
                    order_amount: pendingCollectReq?.order_amount,
                    transaction_amount: txn_detail.net_amount,
                    platform_type,
                    payment_mode: status_response.details.payment_mode,
                    collect_id: collectReq?._id,
                };
                const _jwt = jwt.sign(tokenData, process.env.KEY, {
                    noTimestamp: true,
                });
                const data = JSON.stringify({
                    token: _jwt,
                    school_id: collectReq.school_id,
                    trustee_id: collectReq.trustee_id,
                    order_amount: pendingCollectReq?.order_amount,
                    transaction_amount: txn_detail.net_amount,
                    platform_type,
                    payment_mode: status_response.details.payment_mode,
                    collect_id: collectReq?._id,
                });
                const config = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/add-commission`,
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        'x-api-version': '2023-08-01',
                    },
                    data: data,
                };
                try {
                    await axios_1.default.request(config);
                }
                catch (error) {
                    console.log(error?.message);
                }
            }
            const payment_time = new Date(date_created);
            await this.databaseService.CollectRequestStatusModel.updateOne({
                collect_id: collectIdObject,
            }, {
                $set: {
                    status,
                    transaction_amount,
                    payment_method,
                    details: JSON.stringify(details),
                    payment_time,
                    bank_reference: content.order.payment_gateway_response.gateway_response.authCode,
                },
            }, {
                upsert: true,
                new: true,
            });
            const webHookUrl = collectReq?.req_webhook_urls;
            const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            if (!collectRequestStatus)
                throw new Error('Collect request not found');
            const transactionTime = collectRequestStatus.updatedAt;
            if (!transactionTime)
                throw new Error('Transaction time not found');
            const amount = collectReq.amount;
            const custom_order_id = collectReq.custom_order_id || '';
            const additional_data = collectReq.additional_data || '';
            const webHookDataInfo = {
                collect_id: collectReq._id.toString(),
                amount,
                status,
                trustee_id: collectReq.trustee_id,
                school_id: collectReq.school_id,
                req_webhook_urls: collectReq?.req_webhook_urls,
                custom_order_id,
                createdAt: collectRequestStatus?.createdAt,
                transaction_time: transactionTime,
                updatedAt: collectRequestStatus?.updatedAt,
                additional_data,
                fformattedDate: `${transactionTime.getFullYear()}-${String(transactionTime.getMonth() + 1).padStart(2, '0')}-${String(transactionTime.getDate()).padStart(2, '0')}`,
            };
            if (webHookUrl !== null) {
                console.log('calling webhook');
                if (collectReq?.trustee_id.toString() === '66505181ca3e97e19f142075') {
                    console.log('Webhook called for webschool');
                    setTimeout(async () => {
                        await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo);
                    }, 60000);
                }
                else {
                    console.log('Webhook called for other schools');
                    await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo);
                }
            }
            res.status(200).send('OK');
            return;
        }
        catch (e) {
            res.status(500).send('Internal Server Error');
        }
    }
};
exports.SmartgatewayController = SmartgatewayController;
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SmartgatewayController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('/callback'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SmartgatewayController.prototype, "handleCallbackGet", null);
__decorate([
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SmartgatewayController.prototype, "webhook", null);
exports.SmartgatewayController = SmartgatewayController = __decorate([
    (0, common_1.Controller)('smartgateway'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        smartgateway_service_1.SmartgatewayService,
        edviron_pg_service_1.EdvironPgService])
], SmartgatewayController);
//# sourceMappingURL=smartgateway.controller.js.map