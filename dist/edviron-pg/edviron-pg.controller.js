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
exports.EdvironPgController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const edviron_pg_service_1 = require("./edviron-pg.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const sign_1 = require("../utils/sign");
const axios_1 = require("axios");
const mongoose_1 = require("mongoose");
const jwt = require("jsonwebtoken");
const transactionStatus_1 = require("../types/transactionStatus");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
let EdvironPgController = class EdvironPgController {
    constructor(edvironPgService, databaseService) {
        this.edvironPgService = edvironPgService;
        this.databaseService = databaseService;
    }
    async handleRedirect(req, res) {
        const wallet = req.query.wallet;
        const cardless = req.query.cardless;
        const netbanking = req.query.netbanking;
        const pay_later = req.query.pay_later;
        const upi = req.query.upi;
        const card = req.query.card;
        const school_name = req.query.school_name;
        const easebuzz_pg = req.query.easebuzz_pg;
        const payment_id = req.query.payment_id;
        let disable_modes = '';
        if (wallet)
            disable_modes += `&wallet=${wallet}`;
        if (cardless)
            disable_modes += `&cardless=${cardless}`;
        if (netbanking)
            disable_modes += `&netbanking=${netbanking}`;
        if (pay_later)
            disable_modes += `&pay_later=${pay_later}`;
        if (upi)
            disable_modes += `&upi=${upi}`;
        if (card)
            disable_modes += `&card=${card}`;
        res.send(`<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com?session_id=${req.query.session_id}&collect_request_id=${req.query.collect_request_id}&amount=${req.query.amount}${disable_modes}&platform_charges=${encodeURIComponent(req.query.platform_charges)}&school_name=${school_name}&easebuzz_pg=${easebuzz_pg}&payment_id=${payment_id}";
                }
            </script>`);
    }
    async handleSdkRedirect(req, res) {
        const collect_id = req.query.collect_id;
        const isBlank = req.query.isBlank || false;
        if (!mongoose_1.Types.ObjectId.isValid(collect_id)) {
            return res.redirect(`${process.env.PG_FRONTEND}/order-notfound?collect_id=${collect_id}`);
        }
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_id));
        if (!collectRequest) {
            res.redirect(`${process.env.PG_FRONTEND}/order-notfound?collect_id=${collect_id}`);
        }
        if (collectRequest?.gateway === collect_request_schema_1.Gateway.EDVIRON_CCAVENUE) {
            await this.databaseService.CollectRequestModel.updateOne({
                _id: collect_id,
            }, {
                sdkPayment: true,
            }, {
                new: true,
            });
            res.redirect(collectRequest.payment_data);
        }
        const axios = require('axios');
        const paymentString = JSON.parse(collectRequest?.payment_data);
        const parsedUrl = new URL(paymentString);
        const sessionId = parsedUrl.searchParams.get('session_id');
        const params = new URLSearchParams(paymentString);
        const wallet = params.get('wallet');
        const cardless = params.get('cardless');
        const netbanking = params.get('netbanking');
        const payment_id = params.get('payment_id');
        const easebuzz_pg = params.get('easebuzz_pg');
        const pay_later = params.get('pay_later');
        const upi = params.get('upi');
        const card = params.get('card');
        const session_id = params.get('session_id');
        const platform_charges = params.get('platform_charges');
        const amount = params.get('amount');
        let disable_modes = '';
        if (wallet)
            disable_modes += `&wallet=${wallet}`;
        if (cardless)
            disable_modes += `&cardless=${cardless}`;
        if (netbanking)
            disable_modes += `&netbanking=${netbanking}`;
        if (pay_later)
            disable_modes += `&pay_later=${pay_later}`;
        if (upi)
            disable_modes += `&upi=${upi}`;
        if (card)
            disable_modes += `&card=${card}`;
        await this.databaseService.CollectRequestModel.updateOne({
            _id: collect_id,
        }, {
            sdkPayment: true,
        }, {
            new: true,
        });
        const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id);
        const payload = { school_id: collectReq?.school_id };
        const token = jwt.sign(payload, process.env.PAYMENTS_SERVICE_SECRET, {
            noTimestamp: true,
        });
        const data = { token, school_id: collectReq?.school_id };
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/school-info`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
            },
            data: data,
        };
        const { data: info } = await axios.request(config);
        res.send(`<script type="text/javascript">
                window.onload = function(){
                    location.href = "${process.env.PG_FRONTEND}?session_id=${sessionId}&collect_request_id=${req.query.collect_id}&amount=${amount}${disable_modes}&platform_charges=${encodeURIComponent(platform_charges)}&is_blank=${isBlank}&amount=${amount}&school_name=${info.school_name}&easebuzz_pg=${easebuzz_pg}&payment_id=${payment_id}";
                }
            </script>`);
    }
    async handleCallback(req, res) {
        const { collect_request_id } = req.query;
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
        const info = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        if (!info) {
            throw new Error('transaction not found');
        }
        info.gateway = collect_request_schema_1.Gateway.EDVIRON_PG;
        await info.save();
        const { status } = await this.edvironPgService.checkStatus(collect_request_id, collectRequest);
        if (collectRequest?.sdkPayment) {
            if (status === `SUCCESS`) {
                console.log(`SDK payment success for ${collect_request_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}`);
            }
            console.log(`SDK payment failed for ${collect_request_id}`);
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}`);
        }
        const callbackUrl = new URL(collectRequest?.callbackUrl);
        if (status !== `SUCCESS`) {
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_request_id}&status=cancelled&reason=Payment-declined`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
        return res.redirect(callbackUrl.toString());
    }
    async handleEasebuzzCallback(req, res) {
        const { collect_request_id } = req.query;
        console.log(req.query.status, 'easebuzz callback status');
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
        await collectRequest.save();
        const reqToCheck = await this.edvironPgService.easebuzzCheckStatus(collect_request_id, collectRequest);
        const status = reqToCheck.msg.status;
        if (collectRequest?.sdkPayment) {
            if (status === `success`) {
                console.log(`SDK payment success for ${collect_request_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`);
            }
            console.log(`SDK payment failed for ${collect_request_id}`);
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`);
        }
        const callbackUrl = new URL(collectRequest?.callbackUrl);
        if (status !== `success`) {
            console.log('failure');
            let reason = reqToCheck?.msg?.error_Message || 'payment-declined';
            if (reason === 'Collect Expired') {
                reason = 'Order Expired';
            }
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_request_id}&status=cancelled&reason=${reason}`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
        return res.redirect(callbackUrl.toString());
    }
    async handleEasebuzzCallbackPost(req, res) {
        const { collect_request_id } = req.query;
        console.log(req.query.status, 'easebuzz callback status');
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
        await collectRequest.save();
        const reqToCheck = await this.edvironPgService.easebuzzCheckStatus(collect_request_id, collectRequest);
        const status = reqToCheck.msg.status;
        if (collectRequest?.sdkPayment) {
            if (status === `success`) {
                console.log(`SDK payment success for ${collect_request_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}`);
            }
            console.log(`SDK payment failed for ${collect_request_id}`);
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}`);
        }
        const callbackUrl = new URL(collectRequest?.callbackUrl);
        if (status !== `success`) {
            console.log('failure');
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_request_id}&status=cancelled&reason=payment-declined`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
        return res.redirect(callbackUrl.toString());
    }
    async handleWebhook(body, res) {
        const { data: webHookData } = JSON.parse(JSON.stringify(body));
        console.log('webhook received with data', { body });
        if (!webHookData)
            throw new Error('Invalid webhook data');
        const collect_id = webHookData.order.order_id || body.order.order_id;
        if (!mongoose_1.Types.ObjectId.isValid(collect_id)) {
            throw new Error('collect_id is not valid');
        }
        const collectIdObject = new mongoose_1.Types.ObjectId(collect_id);
        const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
        if (!collectReq)
            throw new Error('Collect request not found');
        const transaction_amount = webHookData?.payment?.payment_amount || null;
        const payment_method = webHookData?.payment?.payment_group || null;
        const saveWebhook = await new this.databaseService.WebhooksModel({
            collect_id: collectIdObject,
            body: JSON.stringify(webHookData),
        }).save();
        const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        if (pendingCollectReq &&
            pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
            console.log('No pending request found for', collect_id);
            res.status(200).send('OK');
            return;
        }
        const reqToCheck = await this.edvironPgService.checkStatus(collect_id, collectReq);
        const { status } = reqToCheck;
        if (status == transactionStatus_1.TransactionStatus.SUCCESS) {
            let platform_type = null;
            const method = payment_method.toLowerCase();
            const platformMap = {
                net_banking: webHookData.payment.payment_method?.netbanking?.netbanking_bank_name,
                debit_card: webHookData.payment.payment_method?.card?.card_network,
                credit_card: webHookData.payment.payment_method?.card?.card_network,
                upi: 'Others',
                wallet: webHookData.payment.payment_method?.app?.provider,
                cardless_emi: webHookData.payment.payment_method?.cardless_emi?.provider,
                pay_later: webHookData.payment?.payment_method?.pay_later?.provider,
            };
            const methodMap = {
                net_banking: 'NetBanking',
                debit_card: 'DebitCard',
                credit_card: 'CreditCard',
                upi: 'UPI',
                wallet: 'Wallet',
                cardless_emi: 'CardLess EMI',
                pay_later: 'PayLater',
                corporate_card: 'CORPORATE CARDS',
            };
            platform_type = platformMap[method];
            const mappedPaymentMethod = methodMap[method];
            const axios = require('axios');
            const tokenData = {
                school_id: collectReq?.school_id,
                trustee_id: collectReq?.trustee_id,
                order_amount: pendingCollectReq?.order_amount,
                transaction_amount,
                platform_type: mappedPaymentMethod,
                payment_mode: platform_type,
                collect_id: collectReq._id,
            };
            const _jwt = jwt.sign(tokenData, process.env.KEY, { noTimestamp: true });
            let data = JSON.stringify({
                token: _jwt,
                school_id: collectReq?.school_id,
                trustee_id: collectReq?.trustee_id,
                order_amount: pendingCollectReq?.order_amount,
                transaction_amount,
                platform_type: mappedPaymentMethod,
                payment_mode: platform_type,
                collect_id: collectReq._id,
            });
            let config = {
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
                const { data: commissionRes } = await axios.request(config);
                console.log('Commission calculation response:', commissionRes);
            }
            catch (error) {
                console.error('Error calculating commission:', error);
            }
        }
        const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
            collect_id: collectIdObject,
        }, {
            $set: {
                status,
                transaction_amount,
                payment_method,
                details: JSON.stringify(webHookData.payment.payment_method),
                bank_reference: webHookData.payment.bank_reference,
            },
        }, {
            upsert: true,
            new: true,
        });
        const webHookUrl = collectReq?.req_webhook_urls;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        const custom_order_id = collectRequest?.custom_order_id || '';
        const additional_data = collectRequest?.additional_data || '';
        if (webHookUrl !== null) {
            const amount = reqToCheck?.amount;
            const webHookData = await (0, sign_1.sign)({
                collect_id,
                amount,
                status,
                trustee_id: collectReq.trustee_id,
                school_id: collectReq.school_id,
                req_webhook_urls: collectReq?.req_webhook_urls,
                custom_order_id,
                createdAt: collectRequestStatus?.createdAt,
                transaction_time: collectRequestStatus?.updatedAt,
                additional_data,
            });
            const createConfig = (url) => ({
                method: 'post',
                maxBodyLength: Infinity,
                url: url,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
                data: webHookData,
            });
            try {
                try {
                    const sendWebhook = (url) => {
                        axios_1.default
                            .request(createConfig(url))
                            .then(() => console.log(`Webhook sent to ${url}`))
                            .catch((error) => console.error(`Error sending webhook to ${url}:`, error.message));
                    };
                    webHookUrl.forEach(sendWebhook);
                }
                catch (error) {
                    console.error('Error in webhook sending process:', error);
                }
            }
            catch (error) {
                console.error('Error sending webhooks:', error);
            }
        }
        res.status(200).send('OK');
    }
    async easebuzzWebhook(body, res) {
        console.log('easebuzz webhook recived with data', body);
        if (!body)
            throw new Error('Invalid webhook data');
        const collect_id = body.txnid;
        console.log('webhook for ', collect_id);
        if (!mongoose_1.Types.ObjectId.isValid(collect_id)) {
            throw new Error('collect_id is not valid');
        }
        const collectIdObject = new mongoose_1.Types.ObjectId(collect_id);
        const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
        if (!collectReq)
            throw new Error('Collect request not found');
        collectReq.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
        await collectReq.save();
        const transaction_amount = body.net_amount_debit || null;
        let payment_method;
        let details;
        const saveWebhook = await new this.databaseService.WebhooksModel({
            collect_id: collectIdObject,
            body: JSON.stringify(body),
        }).save();
        const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        if (pendingCollectReq &&
            pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
            console.log('No pending request found for', collect_id);
            res.status(200).send('OK');
            return;
        }
        const statusResponse = await this.edvironPgService.easebuzzCheckStatus(collect_id, collectReq);
        const reqToCheck = statusResponse;
        console.log(statusResponse, 'status response check');
        const status = reqToCheck.msg.status;
        let platform_type;
        switch (body.mode) {
            case 'MW':
                payment_method = 'wallet';
                platform_type = 'Wallet';
                details = {
                    app: {
                        channel: reqToCheck.msg.bank_name,
                        provider: reqToCheck.msg.bank_name,
                    },
                };
                break;
            case 'OM':
                payment_method = 'wallet';
                platform_type = 'Wallet';
                details = {
                    app: {
                        channel: reqToCheck.msg.bank_name,
                        provider: reqToCheck.msg.bank_name,
                    },
                };
                break;
            case 'NB':
                payment_method = 'net_banking';
                platform_type = 'NetBanking';
                details = {
                    netbanking: {
                        netbanking_bank_code: reqToCheck.msg.bank_code,
                        netbanking_bank_name: reqToCheck.msg.bank_name,
                    },
                };
                break;
            case 'CC':
                payment_method = 'credit_card';
                platform_type = 'CreditCard';
                details = {
                    card: {
                        card_bank_name: reqToCheck.msg.bank_name,
                        provicard_network: reqToCheck.msg.cardCategory,
                        card_number: reqToCheck.msg.cardnum,
                        card_type: 'credit_card',
                    },
                };
                break;
            case 'DC':
                payment_method = 'debit_card';
                platform_type = 'DebitCard';
                details = {
                    card: {
                        card_bank_name: reqToCheck.msg.bank_name,
                        provicard_network: reqToCheck.msg.cardCategory,
                        card_number: reqToCheck.msg.cardnum,
                        card_type: 'debit_card',
                    },
                };
                break;
            case 'UPI':
                payment_method = 'upi';
                platform_type = 'UPI';
                details = {
                    upi: {
                        upi_id: reqToCheck.msg.upi_va,
                    },
                };
                break;
            case 'PL':
                payment_method = 'pay_later';
                platform_type = 'PayLater';
                details = {
                    pay_later: {
                        channel: reqToCheck.msg.bank_name,
                        provider: reqToCheck.msg.bank_name,
                    },
                };
                break;
            default:
                payment_method = 'Unknown';
        }
        const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
            collect_id: collectIdObject,
        }, {
            $set: {
                status,
                transaction_amount,
                payment_method,
                details: JSON.stringify(details),
                bank_reference: body.bank_ref_num,
            },
        }, {
            upsert: true,
            new: true,
        });
        const webHookUrl = collectReq?.req_webhook_urls;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        const custom_order_id = collectRequest?.custom_order_id || '';
        const additional_data = collectRequest?.additional_data || '';
        if (webHookUrl !== null) {
            const amount = reqToCheck?.amount;
            const webHookData = await (0, sign_1.sign)({
                collect_id,
                amount,
                status,
                trustee_id: collectReq.trustee_id,
                school_id: collectReq.school_id,
                req_webhook_urls: collectReq?.req_webhook_urls,
                custom_order_id,
                createdAt: collectRequestStatus?.createdAt,
                transaction_time: collectRequestStatus?.updatedAt,
                additional_data,
            });
            const createConfig = (url) => ({
                method: 'post',
                maxBodyLength: Infinity,
                url: url,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
                data: webHookData,
            });
            try {
                try {
                    const sendWebhook = (url) => {
                        axios_1.default
                            .request(createConfig(url))
                            .then(() => console.log(`Webhook sent to ${url}`))
                            .catch((error) => console.error(`Error sending webhook to ${url}:`, error.message));
                    };
                    webHookUrl.forEach(sendWebhook);
                }
                catch (error) {
                    console.error('Error in webhook sending process:', error);
                }
            }
            catch (error) {
                console.error('Error sending webhooks:', error);
            }
            const payment_mode = body.bank_name;
            const tokenData = {
                school_id: collectReq?.school_id,
                trustee_id: collectReq?.trustee_id,
                order_amount: pendingCollectReq?.order_amount,
                transaction_amount,
                platform_type,
                payment_mode,
                collect_id: collectReq?._id,
            };
            const _jwt = jwt.sign(tokenData, process.env.KEY, { noTimestamp: true });
            let data = JSON.stringify({
                token: _jwt,
                school_id: collectReq?.school_id,
                trustee_id: collectReq?.trustee_id,
                order_amount: pendingCollectReq?.order_amount,
                transaction_amount,
                platform_type,
                payment_mode,
                collect_id: collectReq?._id,
            });
            let config = {
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
                const { data: commissionRes } = await axios_1.default.request(config);
                console.log(commissionRes, 'Commission saved');
            }
            catch (e) {
                console.log(`failed to save commision ${e.message}`);
            }
            res.status(200).send('OK');
        }
    }
    async transactionsReport(body, res, req) {
        const { school_id, token } = body;
        if (!token)
            throw new Error('Token not provided');
        console.log(`getting transaction report`);
        try {
            const page = req.query.page || 1;
            const limit = req.query.limit || 10;
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const status = req.query.status || null;
            let decrypted = jwt.verify(token, process.env.KEY);
            if (JSON.stringify({
                ...JSON.parse(JSON.stringify(decrypted)),
                iat: undefined,
                exp: undefined,
            }) !==
                JSON.stringify({
                    school_id,
                })) {
                throw new common_1.ForbiddenException('Request forged');
            }
            const orders = await this.databaseService.CollectRequestModel.find({
                school_id: school_id,
            }).select('_id');
            if (orders.length == 0) {
                console.log('No orders found for client_id', school_id);
                res.status(201).send({ transactions: [], totalTransactions: 0 });
                return;
            }
            const orderIds = orders.map((order) => order._id);
            let query = {
                collect_id: { $in: orderIds },
            };
            if (startDate && endDate) {
                query = {
                    ...query,
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: new Date(endDate),
                    },
                };
            }
            if (status === 'SUCCESS' || status === 'PENDING') {
                query = {
                    ...query,
                    status,
                };
            }
            const transactionsCount = await this.databaseService.CollectRequestStatusModel.countDocuments(query);
            const transactions = await this.databaseService.CollectRequestStatusModel.aggregate([
                {
                    $match: query,
                },
                {
                    $lookup: {
                        from: 'collectrequests',
                        localField: 'collect_id',
                        foreignField: '_id',
                        as: 'collect_request',
                    },
                },
                {
                    $unwind: '$collect_request',
                },
                {
                    $project: {
                        _id: 0,
                        __v: 0,
                        'collect_request._id': 0,
                        'collect_request.__v': 0,
                        'collect_request.createdAt': 0,
                        'collect_request.updatedAt': 0,
                        'collect_request.callbackUrl': 0,
                        'collect_request.clientId': 0,
                        'collect_request.clientSecret': 0,
                        'collect_request.webHookUrl': 0,
                        'collect_request.disabled_modes': 0,
                        'collect_request.gateway': 0,
                        'collect_request.amount': 0,
                        'collect_request.trustee_id': 0,
                        'collect_request.sdkPayment': 0,
                        'collect_request.payment_data': 0,
                        'collect_request.ccavenue_merchant_id': 0,
                        'collect_request.ccavenue_access_code': 0,
                        'collect_request.ccavenue_working_key': 0,
                        'collect_request.easebuzz_sub_merchant_id': 0,
                    },
                },
                {
                    $project: {
                        collect_id: 1,
                        collect_request: 1,
                        status: 1,
                        transaction_amount: 1,
                        order_amount: 1,
                        payment_method: 1,
                        details: 1,
                        bank_reference: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    },
                },
                {
                    $addFields: {
                        collect_request: {
                            $mergeObjects: [
                                '$collect_request',
                                {
                                    status: '$status',
                                    transaction_amount: '$transaction_amount',
                                    payment_method: '$payment_method',
                                    details: '$details',
                                    bank_reference: '$bank_reference',
                                    collect_id: '$collect_id',
                                    order_amount: '$order_amount',
                                    merchant_id: '$collect_request.school_id',
                                    currency: 'INR',
                                    createdAt: '$createdAt',
                                    updatedAt: '$updatedAt',
                                    transaction_time: '$updatedAt',
                                    custom_order_id: '$collect_request.custom_order_id',
                                },
                            ],
                        },
                    },
                },
                {
                    $replaceRoot: { newRoot: '$collect_request' },
                },
                {
                    $project: {
                        school_id: 0,
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $skip: (page - 1) * limit,
                },
                {
                    $limit: Number(limit),
                },
            ]);
            res
                .status(201)
                .send({ transactions, totalTransactions: transactionsCount });
        }
        catch (error) {
            console.log(error);
            if (error.name === 'JsonWebTokenError')
                throw new common_1.UnauthorizedException('JWT invalid');
            throw error;
        }
    }
    async getTransactionInfo(body) {
        const { school_id, collect_request_id, token } = body;
        try {
            if (!collect_request_id) {
                throw new Error('Collect request id not provided');
            }
            if (!token)
                throw new Error('Token not provided');
            let decrypted = jwt.verify(token, process.env.KEY);
            if (decrypted.school_id != school_id) {
                throw new common_1.ForbiddenException('Request forged');
            }
            if (decrypted.collect_request_id != collect_request_id) {
                throw new common_1.ForbiddenException('Request forged');
            }
            const transactions = await this.databaseService.CollectRequestStatusModel.aggregate([
                {
                    $match: {
                        collect_id: new mongoose_1.Types.ObjectId(collect_request_id),
                    },
                },
                {
                    $lookup: {
                        from: 'collectrequests',
                        localField: 'collect_id',
                        foreignField: '_id',
                        as: 'collect_request',
                    },
                },
                {
                    $unwind: '$collect_request',
                },
                {
                    $project: {
                        _id: 0,
                        __v: 0,
                        'collect_request._id': 0,
                        'collect_request.__v': 0,
                        'collect_request.createdAt': 0,
                        'collect_request.updatedAt': 0,
                        'collect_request.callbackUrl': 0,
                        'collect_request.clientId': 0,
                        'collect_request.clientSecret': 0,
                        'collect_request.webHookUrl': 0,
                        'collect_request.disabled_modes': 0,
                        'collect_request.gateway': 0,
                        'collect_request.amount': 0,
                        'collect_request.trustee_id': 0,
                        'collect_request.sdkPayment': 0,
                        'collect_request.payment_data': 0,
                        'collect_request.ccavenue_merchant_id': 0,
                        'collect_request.ccavenue_access_code': 0,
                        'collect_request.ccavenue_working_key': 0,
                        'collect_request.easebuzz_sub_merchant_id': 0,
                    },
                },
                {
                    $project: {
                        collect_id: 1,
                        collect_request: 1,
                        status: 1,
                        transaction_amount: 1,
                        order_amount: 1,
                        payment_method: 1,
                        details: 1,
                        bank_reference: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    },
                },
                {
                    $addFields: {
                        collect_request: {
                            $mergeObjects: [
                                '$collect_request',
                                {
                                    status: '$status',
                                    transaction_amount: '$transaction_amount',
                                    payment_method: '$payment_method',
                                    details: '$details',
                                    bank_reference: '$bank_reference',
                                    collect_id: '$collect_id',
                                    order_amount: '$order_amount',
                                    merchant_id: '$collect_request.school_id',
                                    currency: 'INR',
                                    createdAt: '$createdAt',
                                    updatedAt: '$updatedAt',
                                },
                            ],
                        },
                    },
                },
                {
                    $replaceRoot: { newRoot: '$collect_request' },
                },
                {
                    $project: {
                        school_id: 0,
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
            ]);
            return transactions;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async bulkTransactions(body, res, req) {
        const { trustee_id, token } = body;
        if (!token)
            throw new Error('Token not provided');
        try {
            const page = req.query.page || 1;
            const limit = req.query.limit || 10;
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const status = req.query.status || null;
            let decrypted = jwt.verify(token, process.env.KEY);
            if (JSON.stringify({
                ...JSON.parse(JSON.stringify(decrypted)),
                iat: undefined,
                exp: undefined,
            }) !==
                JSON.stringify({
                    trustee_id,
                })) {
                throw new common_1.ForbiddenException('Request forged');
            }
            const orders = await this.databaseService.CollectRequestModel.find({
                trustee_id: trustee_id,
            }).select('_id');
            let transactions = [];
            const orderIds = orders.map((order) => order._id);
            let query = {
                collect_id: { $in: orderIds },
            };
            if (startDate && endDate) {
                query = {
                    ...query,
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: new Date(endDate),
                    },
                };
            }
            console.log(`getting transaction`);
            if (status === 'SUCCESS' || status === 'PENDING') {
                query = {
                    ...query,
                    status,
                };
            }
            const transactionsCount = await this.databaseService.CollectRequestStatusModel.countDocuments(query);
            transactions =
                await this.databaseService.CollectRequestStatusModel.aggregate([
                    {
                        $match: query,
                    },
                    {
                        $lookup: {
                            from: 'collectrequests',
                            localField: 'collect_id',
                            foreignField: '_id',
                            as: 'collect_request',
                        },
                    },
                    {
                        $unwind: '$collect_request',
                    },
                    {
                        $project: {
                            _id: 0,
                            __v: 0,
                            'collect_request._id': 0,
                            'collect_request.__v': 0,
                            'collect_request.createdAt': 0,
                            'collect_request.updatedAt': 0,
                            'collect_request.callbackUrl': 0,
                            'collect_request.clientId': 0,
                            'collect_request.clientSecret': 0,
                            'collect_request.webHookUrl': 0,
                            'collect_request.disabled_modes': 0,
                            'collect_request.gateway': 0,
                            'collect_request.amount': 0,
                            'collect_request.trustee_id': 0,
                            'collect_request.sdkPayment': 0,
                            'collect_request.payment_data': 0,
                            'collect_request.ccavenue_merchant_id': 0,
                            'collect_request.ccavenue_access_code': 0,
                            'collect_request.ccavenue_working_key': 0,
                            'collect_request.easebuzz_sub_merchant_id': 0,
                        },
                    },
                    {
                        $project: {
                            collect_id: 1,
                            collect_request: 1,
                            status: 1,
                            transaction_amount: 1,
                            order_amount: 1,
                            payment_method: 1,
                            details: 1,
                            bank_reference: 1,
                            createdAt: 1,
                            updatedAt: 1,
                        },
                    },
                    {
                        $addFields: {
                            collect_request: {
                                $mergeObjects: [
                                    '$collect_request',
                                    {
                                        status: '$status',
                                        transaction_amount: '$transaction_amount',
                                        payment_method: '$payment_method',
                                        details: '$details',
                                        bank_reference: '$bank_reference',
                                        collect_id: '$collect_id',
                                        order_amount: '$order_amount',
                                        merchant_id: '$collect_request.school_id',
                                        currency: 'INR',
                                        createdAt: '$createdAt',
                                        updatedAt: '$updatedAt',
                                        transaction_time: '$updatedAt',
                                        custom_order_id: '$collect_request.custom_order_id',
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $replaceRoot: { newRoot: '$collect_request' },
                    },
                    {
                        $project: {
                            school_id: 0,
                        },
                    },
                    {
                        $sort: { createdAt: -1 },
                    },
                    {
                        $skip: (page - 1) * limit,
                    },
                    {
                        $limit: Number(limit),
                    },
                ]);
            res
                .status(201)
                .send({ transactions, totalTransactions: transactionsCount });
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getErpLogo(collect_id) {
        try {
            const collect_request = await this.databaseService.CollectRequestModel.findById(collect_id);
            const trustee_id = collect_request?.trustee_id;
            const payload = { trustee_id };
            const token = jwt.sign(payload, process.env.KEY, {
                noTimestamp: true,
            });
            const data = { token };
            const response = await (0, axios_1.default)({
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/trustee-logo?trustee_id=${trustee_id}`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
                data: data,
            });
            return response.data;
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async getSchoolId(collect_id) {
        try {
            const collect_request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collect_request) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            return collect_request.school_id;
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async getGatewayName(req) {
        try {
            const token = req.query.token;
            let decrypted = jwt.verify(token, process.env.JWT_SECRET_FOR_TRUSTEE);
            const order_id = decrypted.order_id;
            const order = await this.databaseService.CollectRequestModel.findOne({
                _id: order_id,
            });
            if (!order) {
                throw new Error('Invalid Order ID');
            }
            return order.gateway;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getpaymentRatio(body) {
        const { school_id, mode, start_date } = body;
        const payments = await this.edvironPgService.getPaymentDetails(school_id, start_date, mode);
        let cashfreeSum = 0;
        let easebuzzSum = 0;
        for (const payment of payments) {
            const gateway = payment.gateway;
            const amount = payment.transaction_amount;
            if (gateway === collect_request_schema_1.Gateway.EDVIRON_PG) {
                cashfreeSum += amount;
            }
            else if (gateway === collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ) {
                easebuzzSum += amount;
            }
        }
        const totalTransactionAmount = cashfreeSum + easebuzzSum;
        const percentageCashfree = parseFloat(((cashfreeSum / totalTransactionAmount) * 100).toFixed(2));
        const percentageEasebuzz = parseFloat(((easebuzzSum / totalTransactionAmount) * 100).toFixed(2));
        return { cashfreeSum, easebuzzSum, percentageCashfree, percentageEasebuzz };
    }
};
exports.EdvironPgController = EdvironPgController;
__decorate([
    (0, common_1.Get)('/redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleRedirect", null);
__decorate([
    (0, common_1.Get)('/sdk-redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleSdkRedirect", null);
__decorate([
    (0, common_1.Get)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('/easebuzz-callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleEasebuzzCallback", null);
__decorate([
    (0, common_1.Post)('/easebuzz-callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleEasebuzzCallbackPost", null);
__decorate([
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('/easebuzz/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "easebuzzWebhook", null);
__decorate([
    (0, common_1.Get)('transactions-report'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "transactionsReport", null);
__decorate([
    (0, common_1.Get)('transaction-info'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getTransactionInfo", null);
__decorate([
    (0, common_1.Get)('bulk-transactions-report'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "bulkTransactions", null);
__decorate([
    (0, common_1.Get)('erp-logo'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getErpLogo", null);
__decorate([
    (0, common_1.Get)('school-id'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getSchoolId", null);
__decorate([
    (0, common_1.Get)('gatewat-name'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getGatewayName", null);
__decorate([
    (0, common_1.Get)('/payments-ratio'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getpaymentRatio", null);
exports.EdvironPgController = EdvironPgController = __decorate([
    (0, common_1.Controller)('edviron-pg'),
    __metadata("design:paramtypes", [edviron_pg_service_1.EdvironPgService,
        database_service_1.DatabaseService])
], EdvironPgController);
//# sourceMappingURL=edviron-pg.controller.js.map