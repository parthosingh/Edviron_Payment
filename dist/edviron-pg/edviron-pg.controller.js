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
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
const cashfree_service_1 = require("../cashfree/cashfree.service");
const moment = require("moment-timezone");
const qs = require("qs");
const _jwt = require("jsonwebtoken");
const nttdata_service_1 = require("../nttdata/nttdata.service");
const pos_paytm_service_1 = require("../pos-paytm/pos-paytm.service");
const worldline_service_1 = require("../worldline/worldline.service");
const razorpay_nonseamless_service_1 = require("../razorpay-nonseamless/razorpay-nonseamless.service");
const razorpay_service_1 = require("../razorpay/razorpay.service");
let EdvironPgController = class EdvironPgController {
    constructor(edvironPgService, databaseService, easebuzzService, cashfreeService, nttDataService, posPaytmService, worldlineService, razorpayNonseamless, razorpaySeamless) {
        this.edvironPgService = edvironPgService;
        this.databaseService = databaseService;
        this.easebuzzService = easebuzzService;
        this.cashfreeService = cashfreeService;
        this.nttDataService = nttDataService;
        this.posPaytmService = posPaytmService;
        this.worldlineService = worldlineService;
        this.razorpayNonseamless = razorpayNonseamless;
        this.razorpaySeamless = razorpaySeamless;
    }
    async handleRedirect(req, res) {
        const wallet = req.query.wallet;
        const cardless = req.query.cardless;
        const net_banking = req.query.net_banking;
        const pay_later = req.query.pay_later;
        const upi = req.query.upi;
        const card = req.query.card;
        const school_name = req.query.school_name;
        const easebuzz_pg = req.query.easebuzz_pg;
        const payment_id = req.query.payment_id;
        const razorpay_pg = req.query.razorpay_pg;
        const razorpay_id = req.query.razorpay_id;
        const currency = req.query.currency;
        const gateway = req.query.gateway;
        let disable_modes = '';
        if (wallet)
            disable_modes += `&wallet=${wallet}`;
        if (cardless)
            disable_modes += `&cardless=${cardless}`;
        if (net_banking)
            disable_modes += `&net_banking=${net_banking}`;
        if (pay_later)
            disable_modes += `&pay_later=${pay_later}`;
        if (upi)
            disable_modes += `&upi=${upi}`;
        if (card)
            disable_modes += `&card=${card}`;
        const collectReq = await this.databaseService.CollectRequestModel.findById(req.query.collect_request_id);
        if (!collectReq) {
            throw new common_1.NotFoundException('Collect request not found');
        }
        const school_id = collectReq.school_id;
        if (collectReq.isMasterGateway) {
            res.send(`<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com/payments?session_id=${req.query.session_id}&collect_request_id=${req.query.collect_request_id}&amount=${req.query.amount}${disable_modes}&platform_charges=${encodeURIComponent(req.query.platform_charges)}&school_name=${school_name}&easebuzz_pg=${easebuzz_pg}&razorpay_pg=${razorpay_pg}&razorpay_order_id=${razorpay_id}&payment_id=${payment_id}&school_id=${school_id}&gateway=${gateway}";

                }
            </script>`);
        }
        res.send(`<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com?session_id=${req.query.session_id}&collect_request_id=${req.query.collect_request_id}&amount=${req.query.amount}${disable_modes}&platform_charges=${encodeURIComponent(req.query.platform_charges)}&school_name=${school_name}&easebuzz_pg=${easebuzz_pg}&razorpay_pg=${razorpay_pg}&razorpay_order_id=${razorpay_id}&payment_id=${payment_id}&school_id=${school_id}&currency=${currency}";

                }
            </script>`);
    }
    async handleSdkRedirect(req, res) {
        const collect_id = req.query.collect_id;
        let isBlank = req.query.isBlank || false;
        if (isBlank !== 'true' || true) {
            isBlank = 'false';
        }
        if (!mongoose_1.Types.ObjectId.isValid(collect_id)) {
            return res.redirect(`${process.env.PG_FRONTEND}/order-notfound?collect_id=${collect_id}`);
        }
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_id));
        if (!collectRequest) {
            res.redirect(`${process.env.PG_FRONTEND}/order-notfound?collect_id=${collect_id}`);
        }
        const masterGateway = collectRequest?.isMasterGateway || false;
        if (masterGateway) {
            const url = `${process.env.PG_FRONTEND}/select-gateway?collect_id=${collectRequest._id}`;
            return res.redirect(url);
        }
        if (collectRequest?.easebuzz_non_partner) {
            res.redirect(`${process.env.EASEBUZZ_ENDPOINT_PROD}/pay/${collectRequest.paymentIds.easebuzz_id}`);
        }
        if (collectRequest &&
            collectRequest.worldline &&
            collectRequest.worldline.worldline_merchant_id) {
            await this.databaseService.CollectRequestModel.updateOne({
                _id: collect_id,
            }, {
                sdkPayment: true,
            }, {
                new: true,
            });
            res.redirect(collectRequest.payment_data);
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
        if (collectReq?.isCFNonSeamless) {
            const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting to Payment...</title>
          <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
      </head>
      <body>
          <p>Redirecting to payment page...</p>
          <script>
              const cashfree = Cashfree({ mode: "production" });
              const checkoutOptions = {
                  paymentSessionId: "${sessionId}",
                  redirectTarget: "_self"
              };
              cashfree.checkout(checkoutOptions);
          </script>
      </body>
      </html>
    `;
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
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
        try {
            const { collect_request_id } = req.query;
            console.log({ collect_request_id });
            const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
            const info = await this.databaseService.CollectRequestModel.findById(collect_request_id);
            if (!info) {
                throw new Error('transaction not found');
            }
            if (info.gateway !== collect_request_schema_1.Gateway.PENDING &&
                info.gateway !== collect_request_schema_1.Gateway.EDVIRON_PG) {
                const reqStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: info._id,
                });
                const callbackUrl = new URL(collectRequest?.callbackUrl);
                callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
                if (!reqStatus) {
                    return res.redirect(callbackUrl.toString());
                }
                callbackUrl.searchParams.set('status', reqStatus?.status.toString());
                return res.redirect(callbackUrl.toString());
            }
            info.gateway = collect_request_schema_1.Gateway.EDVIRON_PG;
            await info.save();
            if (!collectRequest) {
                throw new common_1.NotFoundException('Collect request not found');
            }
            let status;
            if (collectRequest.cashfree_non_partner &&
                collectRequest.cashfree_credentials) {
                const status2 = await this.cashfreeService.checkStatusV2(collect_request_id);
                status = status2.status;
            }
            else {
                const status1 = await this.edvironPgService.checkStatus(collect_request_id, collectRequest);
                status = status1.status;
            }
            if (collectRequest?.sdkPayment) {
                if (status === `SUCCESS`) {
                    const callbackUrl = new URL(collectRequest?.callbackUrl);
                    callbackUrl.searchParams.set('status', 'SUCCESS');
                    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
                    return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}`);
                }
                console.log(`SDK payment failed for ${collect_request_id}`);
                res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}`);
            }
            const callbackUrl = new URL(collectRequest?.callbackUrl);
            if (status !== `SUCCESS`) {
                callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
                return res.redirect(`${callbackUrl.toString()}&status=cancelled&reason=Payment-declined`);
            }
            if (collectRequest.isSplitPayments) {
                await this.databaseService.VendorTransactionModel.updateMany({ collect_id: info._id }, { $set: { status: 'SUCCESS' } });
            }
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
            callbackUrl.searchParams.set('status', 'SUCCESS');
            return res.redirect(callbackUrl.toString());
        }
        catch (e) {
            console.log(e);
            return res.status(500).send('Internal Server Error');
        }
    }
    async handleEasebuzzCallback(req, res) {
        const { collect_request_id } = req.query;
        console.log(req.query.status, 'easebuzz callback status');
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
        if (collectRequest.gateway !== collect_request_schema_1.Gateway.PENDING &&
            collectRequest.gateway !== collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ) {
            const reqStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectRequest._id,
            });
            const callbackUrl = new URL(collectRequest?.callbackUrl);
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
            if (!reqStatus) {
                return res.redirect(callbackUrl.toString());
            }
            callbackUrl.searchParams.set('status', reqStatus?.status.toString());
            return res.redirect(callbackUrl.toString());
        }
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
        await collectRequest.save();
        const reqToCheck = await this.easebuzzService.statusResponse(collect_request_id, collectRequest);
        const status = reqToCheck.msg.status;
        if (collectRequest?.sdkPayment) {
            const callbackUrl = new URL(collectRequest?.callbackUrl);
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
            if (status === `success`) {
                console.log(`SDK payment success for ${collect_request_id}`);
                callbackUrl.searchParams.set('status', 'SUCCESS');
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`);
            }
            console.log(`SDK payment failed for ${collect_request_id}`);
            callbackUrl.searchParams.set('status', 'SUCCESS');
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`);
        }
        const callbackUrl = new URL(collectRequest?.callbackUrl);
        if (status.toLocaleLowerCase() !== `success`) {
            console.log('failure');
            let reason = reqToCheck?.msg?.error_Message || 'payment-declined';
            if (reason === 'Collect Expired') {
                reason = 'Order Expired';
            }
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
            return res.redirect(`${callbackUrl.toString()}&status=cancelled&reason=${reason}`);
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
        const reqToCheck = await this.easebuzzService.statusResponse(collect_request_id, collectRequest);
        const status = reqToCheck.msg.status;
        if (collectRequest?.sdkPayment) {
            const callbackUrl = new URL(collectRequest?.callbackUrl);
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
            if (status === `success`) {
                console.log(`SDK payment success for ${collect_request_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}`);
            }
            console.log(`SDK payment failed for ${collect_request_id}`);
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}`);
        }
        const callbackUrl = new URL(collectRequest?.callbackUrl);
        if (status.toLocaleLowerCase() !== `success`) {
            console.log('failure');
            let reason = reqToCheck?.msg?.error_Message || 'payment-declined';
            if (reason === 'Collect Expired') {
                reason = 'Order Expired';
            }
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
            return res.redirect(`${callbackUrl.toString()}&status=cancelled&reason=${reason}`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
        return res.redirect(callbackUrl.toString());
    }
    async handleWebhook(body, res) {
        const { data: webHookData } = JSON.parse(JSON.stringify(body));
        try {
            await new this.databaseService.WebhooksModel({
                body: JSON.stringify(body),
            }).save();
        }
        catch (e) {
            console.log('Error in saving webhook', e.message);
        }
        if (!webHookData)
            throw new Error('Invalid webhook data');
        const { error_details } = webHookData;
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
        const payment_message = webHookData?.payment?.payment_message || 'NA';
        const saveWebhook = await new this.databaseService.WebhooksModel({
            collect_id: collectIdObject,
            body: JSON.stringify(webHookData),
        }).save();
        const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        if (pendingCollectReq &&
            (pendingCollectReq.status === collect_req_status_schema_1.PaymentStatus.SUCCESS ||
                pendingCollectReq.status === 'success')) {
            console.log('No pending request found for', collect_id);
            res.status(200).send('OK');
            return;
        }
        collectReq.gateway = collect_request_schema_1.Gateway.EDVIRON_PG;
        await collectReq.save();
        const reqToCheck = await this.edvironPgService.checkStatus(collect_id, collectReq);
        const status = webHookData.payment.payment_status;
        const payment_time = new Date(webHookData.payment.payment_time);
        let webhookStatus = status;
        let paymentMode = payment_method;
        let paymentdetails = JSON.stringify(webHookData.payment.payment_method);
        if (pendingCollectReq?.status === 'FAILED' &&
            webhookStatus === 'USER_DROPPED') {
            webhookStatus = 'FAILED';
            paymentMode = pendingCollectReq.payment_method;
            paymentdetails = pendingCollectReq.details;
        }
        try {
            if (status == transactionStatus_1.TransactionStatus.SUCCESS) {
                let platform_type = null;
                const method = payment_method.toLowerCase();
                const platformMap = {
                    net_banking: webHookData.payment.payment_method?.netbanking
                        ?.netbanking_bank_name,
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
                const _jwt = jwt.sign(tokenData, process.env.KEY, {
                    noTimestamp: true,
                });
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
                    console.error('Error calculating commission:', error.message);
                }
            }
        }
        catch (e) {
            console.log('Error in saving Commission');
        }
        if (collectReq.isSplitPayments) {
            try {
                const vendor = await this.databaseService.VendorTransactionModel.updateMany({
                    collect_id: collectReq._id,
                }, {
                    $set: {
                        payment_time: payment_time,
                        status: webhookStatus,
                        gateway: collect_request_schema_1.Gateway.EDVIRON_PG,
                    },
                });
            }
            catch (e) {
                console.log('Error in updating vendor transactions');
            }
        }
        const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
            collect_id: collectIdObject,
        }, {
            $set: {
                status: webhookStatus,
                transaction_amount,
                payment_method: paymentMode,
                details: paymentdetails,
                bank_reference: webHookData.payment.bank_reference,
                payment_time,
                reason: payment_message || 'NA',
                payment_message: payment_message || 'NA',
                error_details: {
                    error_description: error_details?.error_description || 'NA',
                    error_source: error_details?.error_source || 'NA',
                    error_reason: error_details?.error_reason || 'NA',
                },
            },
        }, {
            upsert: true,
            new: true,
        });
        if (collectReq?.isCollectNow) {
            let status = webhookStatus === 'SUCCESS' ? 'paid' : 'unpaid';
            const installments = await this.databaseService.InstallmentsModel.find({
                collect_id: collectIdObject,
            });
            for (let installment of installments) {
                await this.databaseService.InstallmentsModel.findOneAndUpdate({ _id: installment._id }, { $set: { status: status } }, { new: true });
            }
        }
        const webHookUrl = collectReq?.req_webhook_urls;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        if (!collectRequestStatus) {
            throw new Error('Collect Request Not Found');
        }
        const transactionTime = collectRequestStatus.updatedAt;
        if (!transactionTime) {
            throw new Error('Transaction Time Not Found');
        }
        const amount = reqToCheck?.amount;
        const custom_order_id = collectRequest?.custom_order_id || '';
        const additional_data = collectRequest?.additional_data || '';
        const webHookDataInfo = {
            collect_id,
            amount,
            status,
            trustee_id: collectReq.trustee_id,
            school_id: collectReq.school_id,
            req_webhook_urls: collectReq?.req_webhook_urls,
            custom_order_id,
            createdAt: collectRequestStatus?.createdAt,
            transaction_time: payment_time || collectRequestStatus?.updatedAt,
            additional_data,
            details: collectRequestStatus.details,
            transaction_amount: collectRequestStatus.transaction_amount,
            bank_reference: collectRequestStatus.bank_reference,
            payment_method: collectRequestStatus.payment_method,
            payment_details: collectRequestStatus.details,
            formattedDate: `${payment_time.getFullYear()}-${String(payment_time.getMonth() + 1).padStart(2, '0')}-${String(payment_time.getDate()).padStart(2, '0')}`,
        };
        if (webHookUrl !== null) {
            console.log('calling webhook');
            let webhook_key = null;
            try {
                const token = _jwt.sign({ trustee_id: collectReq.trustee_id.toString() }, process.env.KEY);
                const config = {
                    method: 'get',
                    maxBodyLength: Infinity,
                    url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-webhook-key?token=${token}&trustee_id=${collectReq.trustee_id.toString()}`,
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                    },
                };
                const { data } = await axios_1.default.request(config);
                webhook_key = data?.webhook_key;
            }
            catch (error) {
                console.error('Error getting webhook key:', error.message);
            }
            if (collectRequest?.trustee_id.toString() === '66505181ca3e97e19f142075') {
                console.log('Webhook called for webschool');
                setTimeout(async () => {
                    try {
                        await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo, webhook_key);
                    }
                    catch (e) {
                        console.log(`Error sending webhook to ${webHookUrl}:`, e.message);
                    }
                }, 60000);
            }
            else {
                console.log('Webhook called for other schools');
                console.log(webHookDataInfo);
                try {
                    await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo, webhook_key);
                }
                catch (e) {
                    console.log(`Error sending webhook to ${webHookUrl}:`, e.message);
                }
            }
        }
        try {
            await this.edvironPgService.sendMailAfterTransaction(collectIdObject.toString());
        }
        catch (e) {
            await this.databaseService.ErrorLogsModel.create({
                type: 'sendMailAfterTransaction',
                des: collectIdObject.toString(),
                identifier: 'EdvironPg webhook',
                body: e.message || e.toString(),
            });
        }
        res.status(200).send('OK');
    }
    async easebuzzWebhook(body, res) {
        console.log('easebuzz webhook recived with data', body);
        if (!body)
            throw new Error('Invalid webhook data');
        let collect_id = body.txnid;
        if (collect_id.startsWith('upi_')) {
            collect_id = collect_id.replace('upi_', '');
        }
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
        if (collectReq.school_id === '65d443168b8aa46fcb5af3e4') {
            try {
                if (pendingCollectReq &&
                    pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING &&
                    pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                    console.log('Auto Refund for Duplicate Payment ', collect_id);
                    const tokenData = {
                        school_id: collectReq?.school_id,
                        trustee_id: collectReq?.trustee_id,
                    };
                    const token = jwt.sign(tokenData, process.env.KEY, {
                        noTimestamp: true,
                    });
                    const autoRefundConfig = {
                        method: 'POST',
                        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/initiate-auto-refund`,
                        headers: {
                            accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        data: {
                            token,
                            refund_amount: collectReq.amount,
                            collect_id,
                            school_id: collectReq.school_id,
                            trustee_id: collectReq?.trustee_id,
                            custom_id: collectReq.custom_order_id || 'NA',
                            gateway: 'EASEBUZZ',
                            reason: 'Auto Refund due to dual payment',
                        },
                    };
                    const autoRefundResponse = await axios_1.default.request(autoRefundConfig);
                    console.log(autoRefundResponse.data, 'refund');
                    const refund_id = autoRefundResponse.data._id.toString();
                    const refund_amount = autoRefundResponse.data.refund_amount;
                    const refund_process = await this.easebuzzService.initiateRefund(collect_id, refund_amount, refund_id);
                    console.log('Auto refund Initiated', refund_process);
                    pendingCollectReq.isAutoRefund = true;
                    pendingCollectReq.status = collect_req_status_schema_1.PaymentStatus.FAILURE;
                    await pendingCollectReq.save();
                    return res.status(200).send('OK');
                }
            }
            catch (e) {
                console.log(e);
            }
        }
        const statusResponse = await this.edvironPgService.easebuzzCheckStatus(body.txnid, collectReq);
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
                platform_type = 'Others';
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
        if (statusResponse.msg.status.toUpperCase() === 'SUCCESS') {
            try {
                const schoolInfo = await this.edvironPgService.getSchoolInfo(collectReq.school_id);
                const email = schoolInfo.email;
            }
            catch (e) {
                console.log('error in sending transaction mail ');
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
        }
        try {
            if (collectReq.isSplitPayments) {
                try {
                    const vendor = await this.databaseService.VendorTransactionModel.updateMany({
                        collect_id: collectReq._id,
                    }, {
                        $set: {
                            payment_time: new Date(body.addedon),
                            status: status,
                            gateway: collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ,
                        },
                    });
                }
                catch (e) {
                    console.log('Error in updating vendor transactions');
                }
            }
        }
        catch (e) {
            console.log(e);
        }
        const payment_time = new Date(body.addedon);
        const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
            collect_id: collectIdObject,
        }, {
            $set: {
                status,
                transaction_amount,
                payment_method,
                details: JSON.stringify(details),
                bank_reference: body.bank_ref_num,
                payment_time,
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
        if (!collectRequestStatus) {
            throw new Error('Collect Request Not Found');
        }
        const transactionTime = collectRequestStatus.updatedAt;
        if (!transactionTime) {
            throw new Error('Transaction Time Not Found');
        }
        const amount = reqToCheck?.amount;
        const custom_order_id = collectRequest?.custom_order_id || '';
        const additional_data = collectRequest?.additional_data || '';
        const webHookDataInfo = {
            collect_id,
            amount,
            status,
            trustee_id: collectReq.trustee_id,
            school_id: collectReq.school_id,
            req_webhook_urls: collectReq?.req_webhook_urls,
            custom_order_id,
            createdAt: collectRequestStatus?.createdAt,
            transaction_time: payment_time || collectRequestStatus?.updatedAt,
            additional_data,
            details: collectRequestStatus.details,
            transaction_amount: collectRequestStatus.transaction_amount,
            bank_reference: collectRequestStatus.bank_reference,
            payment_method: collectRequestStatus.payment_method,
            payment_details: collectRequestStatus.details,
            formattedDate: `${transactionTime.getFullYear()}-${String(transactionTime.getMonth() + 1).padStart(2, '0')}-${String(transactionTime.getDate()).padStart(2, '0')}`,
        };
        if (webHookUrl !== null) {
            console.log('calling webhook');
            if (collectRequest?.trustee_id.toString() === '66505181ca3e97e19f142075') {
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
        try {
            await this.edvironPgService.sendMailAfterTransaction(collectIdObject.toString());
        }
        catch (e) {
            await this.databaseService.ErrorLogsModel.create({
                type: 'sendMailAfterTransaction',
                des: collectIdObject.toString(),
                identifier: 'EdvironPg webhook',
                body: e.message || e.toString(),
            });
        }
        res.status(200).send('OK');
        return;
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
                    status: { $in: [status.toLowerCase(), status.toUpperCase()] },
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
                        'collect_request.paymentIds': 0,
                        'collect_request.deepLink': 0,
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
                                    isSplitPayments: '$collect_request.isSplitPayments',
                                    vendors_info: '$collect_request.vendors_info',
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
            let transactions = await this.databaseService.CollectRequestStatusModel.aggregate([
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
                        'collect_request.paymentIds': 0,
                        'collect_request.deepLink': 0,
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
                        isPosTransaction: 1,
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
                                    isSplitPayments: '$collect_request.isSplitPayments',
                                    vendors_info: '$collect_request.vendors_info',
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
            const collect_request = await this.databaseService.CollectRequestModel.findById(collect_request_id);
            let paymentId = null;
            if (collect_request) {
                try {
                    paymentId = await this.edvironPgService.getPaymentId(collect_request_id.toString(), collect_request);
                    if (paymentId) {
                        paymentId = paymentId?.toString();
                    }
                }
                catch (e) {
                    paymentId = null;
                }
            }
            try {
                transactions[0].paymentId = paymentId;
            }
            catch (e) {
                console.log('Error setting paymentId:', e);
            }
            console.log(transactions, 'transactions found');
            return transactions;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getTransactionInfoOrder(body) {
        const { school_id, order_id, token } = body;
        try {
            if (!order_id) {
                throw new Error('Collect request id not provided');
            }
            if (!token)
                throw new Error('Token not provided');
            let decrypted = jwt.verify(token, process.env.KEY);
            if (decrypted.school_id != school_id) {
                throw new common_1.ForbiddenException('Request forged');
            }
            if (decrypted.collect_request_id != order_id) {
                throw new common_1.ForbiddenException('Request forged');
            }
            const request = await this.databaseService.CollectRequestModel.findOne({
                custom_order_id: order_id,
            });
            if (!request) {
                throw new common_1.BadRequestException('Invalid Order id');
            }
            const transactions = await this.databaseService.CollectRequestStatusModel.aggregate([
                {
                    $match: {
                        collect_id: request._id,
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
                        'collect_request.paymentIds': 0,
                        'collect_request.deepLink': 0,
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
                                    isSplitPayments: '$collect_request.isSplitPayments',
                                    vendors_info: '$collect_request.vendors_info',
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
        console.time('bulk-transactions-report');
        const { trustee_id, token, searchParams, isCustomSearch, seachFilter, isQRCode, gateway, } = body;
        let { payment_modes } = body;
        if (!token)
            throw new Error('Token not provided');
        if (payment_modes?.includes('upi')) {
            payment_modes = [...payment_modes, 'upi_credit_card'];
        }
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const status = req.query.status || null;
            const school_id = req.query.school_id || null;
            console.log(school_id, 'CHECKING SCHOOL ID');
            const startOfDayUTC = new Date(await this.edvironPgService.convertISTStartToUTC(startDate));
            const endOfDayUTC = new Date(await this.edvironPgService.convertISTEndToUTC(endDate));
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            let collectQuery = {
                trustee_id: trustee_id,
                isCanteenTransaction: { $ne: true },
                createdAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                },
            };
            if (seachFilter === 'student_info') {
                collectQuery = {
                    trustee_id: trustee_id,
                    additional_data: { $regex: searchParams, $options: 'i' },
                };
            }
            if (school_id !== null && school_id !== 'null') {
                console.log(school_id, 'school_id');
                collectQuery = {
                    ...collectQuery,
                    school_id: school_id,
                };
            }
            if (isQRCode) {
                collectQuery = {
                    ...collectQuery,
                    isQRPayment: true,
                };
            }
            if (gateway) {
                collectQuery = {
                    ...collectQuery,
                    gateway: { $in: gateway },
                };
            }
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
            console.time('fetching all transaction');
            console.log(`collectQuery`, collectQuery);
            const orders = await this.databaseService.CollectRequestModel.find(collectQuery).select('_id');
            let transactions = [];
            const orderIds = orders.map((order) => order._id);
            console.timeEnd('fetching all transaction');
            let query = {
                collect_id: { $in: orderIds },
            };
            if (startDate && endDate) {
                query = {
                    ...query,
                    $or: [
                        {
                            payment_time: {
                                $ne: null,
                                $gte: startOfDayUTC,
                                $lt: endOfDayUTC,
                            },
                        },
                        {
                            $and: [
                                { payment_time: { $eq: null } },
                                {
                                    updatedAt: {
                                        $gte: startOfDayUTC,
                                        $lt: endOfDayUTC,
                                    },
                                },
                            ],
                        },
                    ],
                };
            }
            console.log(`getting transaction`);
            if (status === 'SUCCESS' ||
                status === 'PENDING' ||
                status === 'USER_DROPPED') {
                query = {
                    ...query,
                    status: { $in: [status.toLowerCase(), status.toUpperCase()] },
                };
            }
            else if (status === 'FAILED') {
                query = {
                    ...query,
                    status: { $in: ['FAILED', 'FAILURE', 'failure'] },
                };
            }
            if (payment_modes) {
                query = {
                    ...query,
                    payment_method: { $in: payment_modes },
                };
            }
            if (seachFilter === 'upi_id') {
                query = {
                    ...query,
                    details: { $regex: searchParams },
                };
            }
            if (seachFilter === 'bank_reference') {
                const newOrders = await this.databaseService.CollectRequestStatusModel.findOne({
                    bank_reference: { $regex: searchParams },
                });
                if (!newOrders)
                    throw new common_1.NotFoundException('No record found for Input');
                const request = await this.databaseService.CollectRequestModel.findOne({
                    _id: newOrders.collect_id,
                    trustee_id,
                });
                if (!request) {
                    throw new common_1.NotFoundException('No record found for Input');
                }
                query = {
                    collect_id: newOrders.collect_id,
                };
            }
            console.time('aggregating transaction');
            if (seachFilter === 'order_id' ||
                seachFilter === 'custom_order_id' ||
                seachFilter === 'student_info') {
                console.log('Serching custom');
                let searchIfo = {};
                let findQuery = {
                    trustee_id,
                };
                if (school_id !== 'null') {
                    findQuery = {
                        ...findQuery,
                        school_id: school_id,
                    };
                }
                if (seachFilter === 'order_id') {
                    findQuery = {
                        ...findQuery,
                        _id: new mongoose_1.Types.ObjectId(searchParams),
                    };
                    console.log(findQuery, 'findQuery');
                    const checkReq = await this.databaseService.CollectRequestModel.findOne(findQuery);
                    if (!checkReq)
                        throw new common_1.NotFoundException('No record found for Input');
                    console.log('Serching Order_id');
                    searchIfo = {
                        collect_id: new mongoose_1.Types.ObjectId(searchParams),
                    };
                }
                else if (seachFilter === 'custom_order_id') {
                    findQuery = {
                        ...findQuery,
                        custom_order_id: searchParams,
                    };
                    console.log('Serching custom_order_id');
                    console.log(findQuery, 'findQuery');
                    const requestInfo = await this.databaseService.CollectRequestModel.findOne(findQuery);
                    if (!requestInfo)
                        throw new common_1.NotFoundException('No record found for Input');
                    searchIfo = {
                        collect_id: requestInfo._id,
                    };
                }
                else if (seachFilter === 'student_info') {
                    console.log('Serching student_info');
                    const studentRegex = {
                        $regex: searchParams,
                        $options: 'i',
                    };
                    console.log(studentRegex);
                    console.log(trustee_id, 'trustee');
                    const requestInfo = await this.databaseService.CollectRequestModel.find({
                        trustee_id: trustee_id,
                        additional_data: { $regex: searchParams, $options: 'i' },
                    })
                        .sort({ createdAt: -1 })
                        .select('_id');
                    console.log(requestInfo, 'Regex');
                    if (!requestInfo)
                        throw new common_1.NotFoundException(`No record found for ${searchParams}`);
                    const requestId = requestInfo.map((order) => order._id);
                    searchIfo = {
                        collect_id: { $in: requestId },
                    };
                }
                transactions =
                    await this.databaseService.CollectRequestStatusModel.aggregate([
                        {
                            $match: searchIfo,
                        },
                        { $sort: { createdAt: -1 } },
                        {
                            $skip: (page - 1) * limit,
                        },
                        { $limit: Number(limit) },
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
                                'collect_request.amount': 0,
                                'collect_request.trustee_id': 0,
                                'collect_request.sdkPayment': 0,
                                'collect_request.payment_data': 0,
                                'collect_request.ccavenue_merchant_id': 0,
                                'collect_request.ccavenue_access_code': 0,
                                'collect_request.ccavenue_working_key': 0,
                                'collect_request.easebuzz_sub_merchant_id': 0,
                                'collect_request.paymentIds': 0,
                                'collect_request.deepLink': 0,
                                isVBAPaymentComplete: 0,
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
                                isAutoRefund: 1,
                                payment_time: 1,
                                reason: 1,
                                capture_status: 1,
                                currency: 1,
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
                                            currency: '$currency',
                                            createdAt: '$createdAt',
                                            updatedAt: '$updatedAt',
                                            transaction_time: '$updatedAt',
                                            custom_order_id: '$collect_request.custom_order_id',
                                            isSplitPayments: '$collect_request.isSplitPayments',
                                            vendors_info: '$collect_request.vendors_info',
                                            isAutoRefund: '$isAutoRefund',
                                            payment_time: '$payment_time',
                                            isQRPayment: '$collect_request.isQRPayment',
                                            reason: '$reason',
                                            gateway: '$gateway',
                                            capture_status: '$capture_status',
                                            isVBAPaymentComplete: '$isVBAPaymentComplete',
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
                    ]);
            }
            else {
                transactions =
                    await this.databaseService.CollectRequestStatusModel.aggregate([
                        {
                            $match: query,
                        },
                        { $sort: { createdAt: -1 } },
                        {
                            $skip: (page - 1) * limit,
                        },
                        { $limit: Number(limit) },
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
                                'collect_request.amount': 0,
                                'collect_request.trustee_id': 0,
                                'collect_request.sdkPayment': 0,
                                'collect_request.payment_data': 0,
                                'collect_request.ccavenue_merchant_id': 0,
                                'collect_request.ccavenue_access_code': 0,
                                'collect_request.ccavenue_working_key': 0,
                                'collect_request.easebuzz_sub_merchant_id': 0,
                                'collect_request.paymentIds': 0,
                                'collect_request.deepLink': 0,
                                isVBAPaymentComplete: 0,
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
                                isAutoRefund: 1,
                                payment_time: 1,
                                reason: 1,
                                capture_status: 1,
                                currency: 1,
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
                                            createdAt: '$createdAt',
                                            updatedAt: '$updatedAt',
                                            transaction_time: '$updatedAt',
                                            custom_order_id: '$collect_request.custom_order_id',
                                            isSplitPayments: '$collect_request.isSplitPayments',
                                            vendors_info: '$collect_request.vendors_info',
                                            isAutoRefund: '$isAutoRefund',
                                            payment_time: '$payment_time',
                                            reason: '$reason',
                                            gateway: '$gateway',
                                            capture_status: '$capture_status',
                                            isVBAPaymentComplete: '$isVBAPaymentComplete',
                                            currency: '$currency',
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
            }
            console.timeEnd('aggregating transaction');
            console.log(transactions, 'transactions');
            console.time('counting');
            const tnxCount = await this.databaseService.CollectRequestStatusModel.countDocuments(query);
            console.timeEnd('counting');
            console.timeEnd('bulk-transactions-report');
            res.status(201).send({ transactions, totalTransactions: tnxCount });
        }
        catch (error) {
            console.log(error.message);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async bulkTransactionsCSV(body, res, req) {
        console.time('bulk-transactions-report');
        const { trustee_id, token, searchParams, seachFilter, isQRCode, gateway } = body;
        let { payment_modes } = body;
        if (!token)
            throw new Error('Token not provided');
        if (payment_modes?.includes('upi')) {
            payment_modes = [...payment_modes, 'upi_credit_card'];
        }
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const status = req.query.status || null;
            const school_id = req.query.school_id || null;
            const startOfDayUTC = startDate
                ? new Date(await this.edvironPgService.convertISTStartToUTC(startDate))
                : null;
            const endOfDayUTC = endDate
                ? new Date(await this.edvironPgService.convertISTEndToUTC(endDate))
                : null;
            const decrypted = jwt.verify(token, process.env.KEY);
            if (JSON.stringify({ trustee_id }) !==
                JSON.stringify({
                    ...JSON.parse(JSON.stringify(decrypted)),
                    iat: undefined,
                    exp: undefined,
                })) {
                throw new common_1.ForbiddenException('Request forged');
            }
            const query = {};
            const collectRequestLookup = {
                from: 'collectrequests',
                let: { collect_id: '$collect_id' },
                pipeline: [],
                as: 'collect_request',
            };
            if (startDate && endDate) {
                query.$or = [
                    {
                        payment_time: { $ne: null, $gte: startOfDayUTC, $lt: endOfDayUTC },
                    },
                    {
                        $and: [
                            { payment_time: { $eq: null } },
                            { updatedAt: { $gte: startOfDayUTC, $lt: endOfDayUTC } },
                        ],
                    },
                ];
                collectRequestLookup.pipeline.push({
                    $match: {
                        $expr: { $eq: ['$_id', '$$collect_id'] },
                        createdAt: { $gte: startOfDayUTC, $lt: endOfDayUTC },
                    },
                });
            }
            if (status) {
                if (['SUCCESS', 'PENDING', 'USER_DROPPED'].includes(status)) {
                    query.status = { $in: [status.toLowerCase(), status.toUpperCase()] };
                }
                else if (status === 'FAILED') {
                    query.status = { $in: ['FAILED', 'FAILURE', 'failure'] };
                }
            }
            if (payment_modes) {
                query.payment_method = { $in: payment_modes };
            }
            switch (seachFilter) {
                case 'upi_id':
                    query.details = { $regex: searchParams };
                    break;
                case 'bank_reference':
                    query.bank_reference = { $regex: searchParams };
                    break;
                case 'order_id':
                    query.collect_id = new mongoose_1.Types.ObjectId(searchParams);
                    break;
                case 'custom_order_id':
                    collectRequestLookup.pipeline.push({
                        $match: { custom_order_id: searchParams },
                    });
                    break;
                case 'student_info':
                    collectRequestLookup.pipeline.push({
                        $match: {
                            additional_data: { $regex: searchParams, $options: 'i' },
                        },
                    });
                    break;
            }
            collectRequestLookup.pipeline.push({
                $match: {
                    trustee_id,
                    ...(school_id !== 'null' && { school_id }),
                    ...(isQRCode && { isQRPayment: true }),
                    ...(gateway && { gateway: { $in: gateway } }),
                },
            });
            collectRequestLookup.pipeline.push({
                $project: {
                    __v: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    callbackUrl: 0,
                    clientId: 0,
                    clientSecret: 0,
                    webHookUrl: 0,
                    disabled_modes: 0,
                    amount: 0,
                    trustee_id: 0,
                    sdkPayment: 0,
                    payment_data: 0,
                    ccavenue_merchant_id: 0,
                    ccavenue_access_code: 0,
                    ccavenue_working_key: 0,
                    easebuzz_sub_merchant_id: 0,
                    paymentIds: 0,
                    deepLink: 0,
                },
            });
            const aggregationPipeline = [
                { $match: query },
                { $lookup: collectRequestLookup },
                { $unwind: '$collect_request' },
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
                                    collect_id: '$collect_request._id',
                                    order_amount: '$order_amount',
                                    merchant_id: '$collect_request.school_id',
                                    currency: 'INR',
                                    createdAt: '$createdAt',
                                    updatedAt: '$updatedAt',
                                    transaction_time: '$updatedAt',
                                    custom_order_id: '$collect_request.custom_order_id',
                                    isSplitPayments: '$collect_request.isSplitPayments',
                                    vendors_info: '$collect_request.vendors_info',
                                    isAutoRefund: '$isAutoRefund',
                                    payment_time: '$payment_time',
                                    isQRPayment: '$collect_request.isQRPayment',
                                    reason: '$reason',
                                    gateway: '$gateway',
                                    capture_status: '$capture_status',
                                    isVBAPaymentComplete: '$isVBAPaymentComplete',
                                },
                            ],
                        },
                    },
                },
                { $replaceRoot: { newRoot: '$collect_request' } },
                { $project: { school_id: 0 } },
            ];
            if (!['order_id', 'custom_order_id', 'bank_reference'].includes(seachFilter ?? '')) {
                aggregationPipeline.push({ $skip: (page - 1) * limit }, { $limit: Number(limit) });
            }
            const [transactions, totalTransactions] = await Promise.all([
                this.databaseService.CollectRequestStatusModel.aggregate(aggregationPipeline),
                this.databaseService.CollectRequestStatusModel.countDocuments(query),
            ]);
            console.timeEnd('bulk-transactions-report');
            res.status(201).send({ transactions, totalTransactions });
        }
        catch (error) {
            console.error('Error in bulkTransactionsCSV:', error.message);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async singleTransactionReport(body) {
        try {
            const { collect_id, trustee_id, token } = body;
            if (!token)
                throw new common_1.BadRequestException('Token required');
            const decrypted = jwt.verify(token, process.env.KEY);
            if (decrypted && decrypted?.trustee_id !== trustee_id)
                throw new common_1.ForbiddenException('Request forged');
            if (decrypted && decrypted?.collect_id !== collect_id)
                throw new common_1.ForbiddenException('Request forged');
            const paymentInfo = await this.edvironPgService.getSingleTransactionInfo(collect_id);
            return paymentInfo;
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message || 'Something went wrong');
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
    async easebuzzSettlement(body) { }
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
        try {
            const payments = await this.edvironPgService.getPaymentDetails(school_id, start_date, mode);
            let cashfreeSum = 0;
            let easebuzzSum = 0;
            let razorpaySum = 0;
            for (const payment of payments) {
                const gateway = payment.gateway;
                const amount = payment.transaction_amount;
                if (gateway === collect_request_schema_1.Gateway.EDVIRON_PG) {
                    cashfreeSum += amount;
                }
                else if (gateway === collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ) {
                    easebuzzSum += amount;
                }
                else if (gateway === collect_request_schema_1.Gateway.EDVIRON_RAZORPAY) {
                    razorpaySum += amount;
                }
            }
            const totalTransactionAmount = cashfreeSum + easebuzzSum + razorpaySum;
            let percentageCashfree = 0;
            let percentageEasebuzz = 0;
            let percentageRazorpay = 0;
            if (cashfreeSum !== 0) {
                percentageCashfree = parseFloat(((cashfreeSum / totalTransactionAmount) * 100).toFixed(2));
            }
            if (easebuzzSum !== 0) {
                percentageEasebuzz = parseFloat(((easebuzzSum / totalTransactionAmount) * 100).toFixed(2));
            }
            if (razorpaySum !== 0) {
                percentageRazorpay = parseFloat(((razorpaySum / totalTransactionAmount) * 100).toFixed(2));
            }
            console.log({
                cashfreeSum,
                easebuzzSum,
                percentageCashfree,
                percentageEasebuzz,
                percentageRazorpay,
            });
            return {
                cashfreeSum,
                easebuzzSum,
                razorpaySum,
                percentageCashfree,
                percentageEasebuzz,
                percentageRazorpay,
            };
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getPgStatus(collect_id) {
        console.log(collect_id);
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new common_1.NotFoundException('Collect Request not found');
        }
        console.log(request, 'req');
        const { paymentIds } = request;
        let pgStatus = {
            cashfree: false,
            easebuzz: false,
            razorpay: false,
        };
        if (paymentIds?.cashfree_id) {
            pgStatus.cashfree = true;
        }
        if (paymentIds?.easebuzz_id) {
            pgStatus.easebuzz = true;
        }
        if (request.razorpay && request.razorpay.order_id) {
            pgStatus.razorpay = true;
        }
        return pgStatus;
    }
    async initiaterefund(body) {
        const { collect_id, amount, refund_id, token } = body;
        let decrypted = jwt.verify(token, process.env.KEY);
        if (collect_id !== decrypted.collect_id ||
            amount !== decrypted.amount ||
            refund_id !== decrypted.refund_id) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        try {
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            const gateway = request.gateway;
            console.log(gateway);
            if (gateway === collect_request_schema_1.Gateway.EDVIRON_NTTDATA) {
                const refund = await this.nttDataService.initiateRefund(collect_id, amount, refund_id);
                return refund;
            }
            if (gateway === collect_request_schema_1.Gateway.EDVIRON_RAZORPAY) {
                const refund = await this.razorpayNonseamless.refund(collect_id, amount, refund_id);
                return refund;
            }
            if (gateway === collect_request_schema_1.Gateway.EDVIRON_RAZORPAY_SEAMLESS) {
                const refund = await this.razorpaySeamless.refund(collect_id, amount, refund_id);
                return refund;
            }
            if (gateway === collect_request_schema_1.Gateway.EDVIRON_WORLDLINE) {
                const refund = await this.worldlineService.initiateRefund(collect_id, amount);
                return refund;
            }
            if (gateway === collect_request_schema_1.Gateway.EDVIRON_PG) {
                console.log('refunding fromcashfree');
                const refunds = await this.cashfreeService.initiateRefund(refund_id, amount, collect_id);
                console.log(refunds);
                const response = {
                    collect_id,
                    refund_id,
                    amount,
                };
                return response;
            }
            if (gateway === collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ) {
                console.log('init refund from easebuzz');
                if (request.easebuzz_non_partner) {
                    return await this.easebuzzService.initiateRefundv2(collect_id, amount, refund_id);
                }
                const refund = await this.easebuzzService.initiateRefund(collect_id, amount, refund_id);
                console.log(refund);
                return refund;
            }
            if (gateway === collect_request_schema_1.Gateway.PAYTM_POS) {
                console.log('init refund from paytm pos');
                const refund = await this.posPaytmService.refund(collect_id, amount, refund_id);
                return refund;
            }
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getRefundStatus(req) {
        const collect_id = req.query.collect_id;
        return await this.easebuzzService.checkRefundSttaus(collect_id);
    }
    async sentMail(req) {
        const email = req.query.email;
        const collect_id = req.query.collect_id;
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new common_1.NotFoundException('Collect Request not found');
        }
        console.log(request.school_id);
        const schoolInfo = await this.edvironPgService.getSchoolInfo(request.school_id);
        console.log(schoolInfo);
    }
    async terminate(req) {
        const collect_id = req.query.collect_id;
        return await this.cashfreeService.terminateOrder(collect_id);
    }
    async getCustomId(collect_id) {
        try {
            const result = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!result) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            if (result.custom_order_id) {
                return result.custom_order_id;
            }
            return 'NA';
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async createVendor(body) {
        console.log('vendor');
        const token = body.token;
        console.log(token);
        const { client_id, vendor_info } = body;
        let decrypted = jwt.verify(token, process.env.KEY);
        console.log(decrypted);
        if (decrypted.client_id != body.client_id) {
            throw new common_1.ForbiddenException('Request forged');
        }
        try {
            return await this.edvironPgService.createVendor(client_id, vendor_info);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async checkVendorStatus(token) {
        try {
            const decrypted = jwt.verify(token, process.env.KEY);
            if (!decrypted) {
                throw new common_1.BadRequestException('Invalid Token');
            }
            if (!decrypted.vendor_id || !decrypted.client_id) {
                throw new common_1.BadRequestException('Request Forged');
            }
            return await this.edvironPgService.checkCreatedVendorStatus(decrypted.vendor_id, decrypted.client_id);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
    async vendorTransactions(vendor_id, trustee_id, validate_trustee, school_id, collect_id, token, limit, page) {
        const dataLimit = Number(limit) || 100;
        const dataPage = Number(page) || 1;
        let query = {};
        if (vendor_id) {
            query = { vendor_id };
        }
        else if (school_id) {
            query = { school_id };
        }
        else if (collect_id) {
            query = { collect_id: new mongoose_1.Types.ObjectId(collect_id) };
        }
        else if (trustee_id) {
            query = { trustee_id };
        }
        else {
            throw new common_1.BadRequestException('Invalid request');
        }
        return await this.edvironPgService.getVendorTransactions(query, dataLimit, dataPage);
    }
    async getVendorTransactions(body) {
        console.log('post req');
        try {
            const { vendor_id, trustee_id, school_id, collect_id, token, limit, page, custom_id, start_date, end_date, status, payment_modes, gateway, } = body;
            const dataLimit = Number(limit) || 100;
            const dataPage = Number(page) || 1;
            const decrypted = jwt.verify(token, process.env.KEY);
            if (decrypted.validate_trustee !== trustee_id) {
                throw new common_1.ForbiddenException('Request forged');
            }
            if (collect_id && !(0, mongoose_1.isValidObjectId)(collect_id)) {
                throw new common_1.BadRequestException('please provide valid edviron order id');
            }
            const query = {
                trustee_id,
                ...(vendor_id && { vendor_id }),
                ...(school_id && { school_id: { $in: school_id } }),
                ...(status && { status: { $regex: new RegExp(`^${status}$`, 'i') } }),
                ...(collect_id && { collect_id: new mongoose_1.Types.ObjectId(collect_id) }),
                ...(custom_id && { custom_order_id: custom_id }),
                ...(gateway && { gateway: { $in: gateway } }),
                ...(start_date &&
                    end_date && {
                    updatedAt: {
                        $gte: new Date(start_date),
                        $lte: new Date(new Date(end_date).setHours(23, 59, 59, 999)),
                    },
                }),
            };
            return await this.edvironPgService.getVendorTransactions(query, dataLimit, dataPage, payment_modes);
        }
        catch (error) {
            throw new common_1.BadRequestException({
                statusCode: 400,
                message: error.message || 'Something went wrong',
                error: 'Bad Request',
            });
        }
    }
    async vendorSettlementRecon(body) {
        try {
            const { trustee_id, client_id, token, start_date, end_date, utrNumber, cursor, } = body;
            console.log('reconnn');
            const decoded = jwt.verify(token, process.env.KEY);
            console.log(utrNumber, 'uuuu');
            return await this.cashfreeService.vendorSettlementRecon(client_id, start_date, end_date, utrNumber, cursor);
        }
        catch (e) {
            console.log(e);
        }
    }
    async getQRData(req) {
        const { token, collect_id } = req.query;
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new common_1.NotFoundException('Collect Request not found');
        }
        if (request.deepLink) {
            return await this.easebuzzService.getQrBase64(collect_id);
        }
        try {
            return await this.cashfreeService.getUpiPaymentInfoUrl(collect_id);
        }
        catch (e) {
            console.log(e);
        }
    }
    async getTransactionReportBatched(start_date, end_date, trustee_id, school_id, status) {
        const SchoolIds = school_id && typeof school_id === 'string'
            ? school_id.split(',').map((id) => id.trim()).filter(Boolean)
            : [];
        return await this.edvironPgService.getTransactionReportBatched(trustee_id, start_date, end_date, status, SchoolIds);
    }
    async getTransactionReportBatchedFiltered(body) {
        const { start_date, end_date, trustee_id, school_id, mode, status, isQRPayment, gateway, } = body;
        console.log('getting transaction sum');
        return await this.edvironPgService.getTransactionReportBatchedFilterd(trustee_id, start_date, end_date, status, school_id, mode, isQRPayment, gateway);
    }
    async getErpWebhookLogs(body) {
        const { token, startDate, endDate, limit, page, trustee_id, school_id, status, collect_id, custom_id, } = body;
        let query = {
            trustee_id,
        };
        if (startDate && endDate) {
            const startOfDayUTC = new Date(await this.edvironPgService.convertISTStartToUTC(startDate));
            const endOfDayUTC = new Date(await this.edvironPgService.convertISTEndToUTC(endDate));
            query = {
                trustee_id,
                createdAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                },
            };
        }
        if (school_id) {
            query = {
                ...query,
                school_id: school_id,
            };
        }
        if (collect_id) {
            query = {
                ...query,
                collect_id: new mongoose_1.Types.ObjectId(collect_id),
            };
        }
        if (custom_id) {
            const request = await this.databaseService.CollectRequestModel.findOne({
                custom_order_id: custom_id,
            });
            if (!request) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            query = {
                ...query,
                collect_id: request._id,
            };
        }
        const totalRecords = await this.databaseService.ErpWebhooksLogsModel.countDocuments(query);
        const logs = await this.databaseService.ErpWebhooksLogsModel.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'collectrequests',
                    let: { collectId: '$collect_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$collectId'] } } },
                        { $project: { custom_order_id: 1, _id: 0 } },
                    ],
                    as: 'collectReq',
                },
            },
            {
                $addFields: {
                    custom_order_id: { $arrayElemAt: ['$collectReq.custom_order_id', 0] },
                },
            },
            {
                $project: {
                    collectReq: 0,
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
        ]);
        return {
            erp_webhooks_logs: logs,
            totalRecords: totalRecords / limit,
            page,
        };
    }
    async saveBatchTransactions(body) {
        const status = body.status || null;
        return await this.edvironPgService.generateBacthTransactions(body.trustee_id, body.start_date, body.end_date, status);
    }
    async saveMerchantBatchTransactions(body) {
        const status = body.status || null;
        return await this.edvironPgService.generateMerchantBacthTransactions(body.school_id, body.start_date, body.end_date, status);
    }
    async getBatchTransactions(query) {
        try {
            const { trustee_id, year, token } = query;
            console.log(process.env.KEY);
            const decoded = jwt.verify(token, process.env.KEY);
            if (decoded.trustee_id !== trustee_id) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            return await this.edvironPgService.getBatchTransactions(query.trustee_id, query.year);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getSubtrusteeBatchTransactions(body) {
        try {
            const { school_ids, year } = body;
            const response = await this.edvironPgService.getSubTrusteeBatchTransactions(school_ids, year);
            return response;
        }
        catch (e) { }
    }
    async getMerchantBatchTransactions(query) {
        try {
            const { school_id, year, token } = query;
            const decoded = jwt.verify(token, process.env.KEY);
            if (decoded.school_id !== school_id) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            return await this.edvironPgService.getMerchantBatchTransactions(query.school_id, query.year);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getSubTrusteeBatchTransactions(body) {
        try {
            const { school_id, year, token, subTrusteeId } = body;
            const decoded = jwt.verify(token, process.env.KEY);
            if (decoded.subTrusteeId !== subTrusteeId) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            return await this.edvironPgService.getSUbTrusteeBatchTransactions(school_id, year);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async vendorTransactionsSettlement(body) {
        try {
            const { collect_id, token } = body;
            const decoded = jwt.verify(token, process.env.KEY);
            if (decoded.collect_id !== collect_id) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            const request = await this.databaseService.CollectRequestModel.findById(body.collect_id);
            if (!request) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            const client_id = request.clientId;
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://api.cashfree.com/pg/split/order/vendor/recon`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': client_id,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
                data: {
                    filters: {
                        start_date: null,
                        end_date: null,
                        order_ids: [body.collect_id],
                    },
                    pagination: {
                        limit: 1000,
                    },
                },
            };
            const { data } = await axios_1.default.request(config);
            return data;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getErpTransactionInfo(req) {
        const { collect_request_id, token } = req.query;
        try {
            if (!collect_request_id) {
                throw new Error('Collect request id not provided');
            }
            if (!token)
                throw new Error('Token not provided');
            let decrypted = jwt.verify(token, process.env.KEY);
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
                        'collect_request.paymentIds': 0,
                        'collect_request.deepLink': 0,
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
                        isAutoRefund: 1,
                        payment_time: 1,
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
                                    isSplitPayments: '$collect_request.isSplitPayments',
                                    vendors_info: '$collect_request.vendors_info',
                                    isAutoRefund: '$isAutoRefund',
                                    payment_time: '$payment_time',
                                },
                            ],
                        },
                    },
                },
                {
                    $replaceRoot: { newRoot: '$collect_request' },
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
    async mannualCapture(body) {
        try {
            const { collect_id, amount, capture, token } = body;
            const decoded = jwt.verify(token, process.env.KEY);
            if (decoded.collect_id !== collect_id) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const gateway = collectRequest.gateway;
            if (gateway === collect_request_schema_1.Gateway.EDVIRON_PG) {
                return await this.cashfreeService.initiateCapture(collectRequest.clientId, collect_id, capture, amount);
            }
            throw new common_1.BadRequestException('Capture Not Available');
        }
        catch (e) {
            if (e.response?.message) {
                throw new common_1.BadRequestException(e.response.message);
            }
            throw new common_1.BadRequestException(e.message);
        }
    }
    async resolveDisputes(body) {
        try {
            const { collect_id, token, note, file, doc_type, dispute_id } = body;
            const decoded = jwt.verify(token, process.env.KEY);
            if (decoded.collect_id !== collect_id) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.BadRequestException('Collect request not found');
            }
        }
        catch (e) { }
    }
    async getPaymentsForOrder(req) {
        try {
            const token = req.query.token;
            if (!token) {
                throw new common_1.UnauthorizedException('Token not provided');
            }
            const collect_id = req.query.collect_id;
            const decrypted = jwt.verify(token, process.env.KEY);
            if (decrypted.collect_id !== collect_id) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.BadRequestException('Invalid Order ID');
            }
            const pgLink = collectRequest.payment_data;
            const cleanedString = pgLink.slice(1, -1);
            return cleanedString;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async checkStatusV2(body) {
        const { token, query, trustee_id } = body;
        try {
            if (query.custom_order_id && query.collect_id) {
                throw new common_1.BadRequestException('Please provide either collect_id or custom_order_id');
            }
            if (!query.collect_id && !query.custom_order_id) {
                throw new common_1.BadRequestException('Please provide either collect_id or custom_order_id');
            }
            if (!token) {
                throw new common_1.UnauthorizedException('Token not provided');
            }
            const decoded = jwt.verify(token, process.env.KEY);
            if (decoded.trustee_id !== trustee_id) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            const request = await this.databaseService.CollectRequestModel.findOne(query);
            if (!request) {
                throw new common_1.BadRequestException('Invalid Order ID');
            }
            const status = await this.cashfreeService.getPaymentStatus(request._id.toString(), request.clientId);
            if (status.length > 0) {
                return {
                    status: status[0].payment_status,
                    order_amount: status[0].order_amount,
                    custom_order_id: request.custom_order_id,
                    bank_reference: status[0].bank_reference,
                    error_details: status[0].error_details,
                    order_id: status[0].order_id,
                    payment_completion_time: status[0].payment_completion_time,
                    payment_currency: status[0].payment_currency,
                    payment_group: status[0].payment_group,
                    payment_message: status[0].payment_message,
                    payment_method: status[0].payment_method,
                    payment_time: status[0].payment_time,
                };
            }
            throw new common_1.NotFoundException('Payment Status Not Found');
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getSettlementStatus(req) {
        const request = await this.databaseService.CollectRequestModel.findById(req.query.collect_id);
        if (!request) {
            throw new common_1.NotFoundException('Transaction Not Found');
        }
        if (!request) {
            throw new common_1.NotFoundException('Transaction Not Found');
        }
        const status = await this.cashfreeService.settlementStatus(request._id.toString(), request.clientId);
        return status;
    }
    async getVendonrSingleTransactions(body) {
        const orderId = body.order_id;
        console.log(body.trustee_id);
        if (!orderId) {
            throw new common_1.NotFoundException('Client ID is required');
        }
        const decrypted = jwt.verify(body.token, process.env.KEY);
        if (decrypted.order_id !== orderId) {
            throw new common_1.ForbiddenException('Request forged');
        }
        return await this.edvironPgService.getSingleTransaction(orderId);
    }
    async getMerchantVendonrSingleTransactions(body) {
        const orderId = body.order_id;
        if (!orderId) {
            throw new common_1.NotFoundException('Client ID is required');
        }
        const decrypted = jwt.verify(body.token, process.env.KEY);
        if (decrypted.order_id !== orderId) {
            throw new common_1.ForbiddenException('Request forged');
        }
        return await this.edvironPgService.getSingleTransaction(orderId);
    }
    async updateSchoolMdr(body) {
        const { token, trustee_id, school_id, platform_charges } = body;
        try {
            await this.databaseService.PlatformChargeModel.findOneAndUpdate({ school_id }, { $set: { platform_charges } }, { upsert: true, new: true });
            return { message: 'School MDR updated successfully' };
        }
        catch (e) {
            console.log(e);
            throw new common_1.InternalServerErrorException(e.message);
        }
    }
    async getPaymentMdr(collect_id, payment_mode, platform_type, currency) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.BadRequestException('Invalid collect_id provided');
            }
            const checkAmount = collectRequest.amount;
            const school_id = collectRequest.school_id;
            const schoolMdr = await this.databaseService.PlatformChargeModel.findOne({
                school_id,
            }).lean();
            if (!schoolMdr) {
                throw new common_1.BadRequestException('School MDR details not found');
            }
            let selectedCharge = schoolMdr.platform_charges.find((charge) => charge.payment_mode.toLocaleLowerCase() ===
                payment_mode.toLocaleLowerCase() &&
                charge.platform_type.toLocaleLowerCase() ===
                    platform_type.toLocaleLowerCase());
            if (!selectedCharge) {
                selectedCharge = schoolMdr.platform_charges.find((charge) => charge.payment_mode.toLowerCase() === 'others' &&
                    charge.platform_type.toLowerCase() === platform_type.toLowerCase());
            }
            if (!selectedCharge) {
                throw new common_1.BadRequestException('No MDR found for the given payment mode and platform type');
            }
            const applicableCharges = await this.getApplicableCharge(checkAmount, selectedCharge.range_charge);
            return {
                range_charge: applicableCharges,
            };
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getApplicableCharge(amount, rangeCharge) {
        for (let chargeObj of rangeCharge) {
            if (chargeObj.upto === null || amount <= chargeObj.upto) {
                return chargeObj;
            }
        }
        return null;
    }
    async addCharge(body) {
        const { school_id, platform_type, payment_mode, range_charge } = body;
        const platformCharges = await this.databaseService.PlatformChargeModel.findOne({
            school_id,
        });
        if (!platformCharges) {
            throw new Error('Could not find');
        }
        platformCharges.platform_charges.forEach((platformCharge) => {
            if (platformCharge.platform_type.toLowerCase() ===
                platform_type.toLowerCase() &&
                platformCharge.payment_mode.toLowerCase() === payment_mode.toLowerCase()) {
                throw new common_1.BadRequestException('MDR already present');
            }
        });
    }
    async getCollectDisableMode(collect_id) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            const disableModes = collectRequest.disabled_modes || [];
            return disableModes;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getCardInfo(bin) {
        try {
            const data = qs.stringify({
                appId: process.env.CASHFREE_CARD_APP_ID,
                secretKey: process.env.CASHFREE_CARD_SECRET_KEY,
                cardBin: bin,
            });
            const config = {
                method: 'POST',
                url: 'https://api.cashfree.com/api/v1/vault/cards/cardbin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                data: data,
            };
            const res = await axios_1.default.request(config);
            return res.data;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async vendorrecon(body) {
        try {
            const { limit, merchant_vendor_id, client_id, settlement_id, cursor } = body;
            const data = {
                pagination: {
                    limit,
                    cursor: cursor || null,
                },
                filters: {
                    settlement_id: Number(settlement_id),
                },
            };
            const config = {
                method: 'post',
                url: 'https://api.cashfree.com/pg/recon/vendor',
                headers: {
                    'Content-Type': 'application/json',
                    accept: 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': client_id,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
                data: {
                    pagination: {
                        limit,
                        cursor: cursor || null,
                    },
                    filters: {
                        merchant_vendor_id: merchant_vendor_id,
                        settlement_id: Number(settlement_id),
                    },
                },
            };
            const { data: response } = await axios_1.default.request(config);
            const orderIds = response.data
                .filter((order) => order.merchant_order_id !== null &&
                order.merchant_order_id !== 'NA')
                .map((order) => order.merchant_order_id);
            const customOrders = await this.databaseService.CollectRequestModel.find({
                _id: { $in: orderIds },
            });
            const customOrderMap = new Map(customOrders.map((doc) => [
                doc._id.toString(),
                {
                    custom_order_id: doc.custom_order_id,
                    school_id: doc.school_id,
                    additional_data: doc.additional_data,
                },
            ]));
            const enrichedOrders = response.data
                .filter((order) => order.merchant_order_id && order.merchant_order_id !== 'NA')
                .map((order) => {
                let customData = {};
                let additionalData = {};
                if (order.merchant_order_id && order.merchant_order_id !== 'NA') {
                    customData = customOrderMap.get(order.merchant_order_id) || {};
                    additionalData = JSON.parse(customData?.additional_data);
                }
                return {
                    ...order,
                    custom_order_id: customData.custom_order_id || null,
                    school_id: customData.school_id || null,
                    student_id: additionalData?.student_details?.student_id || null,
                    student_name: additionalData.student_details?.student_name || null,
                    student_email: additionalData.student_details?.student_email || null,
                    student_phone_no: additionalData.student_details?.student_phone_no || null,
                };
            });
            return {
                cursor: response.cursor,
                limit: response.limit,
                settlements_transactions: enrichedOrders,
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async testWebhook(body) {
        try {
            const { token, url, trustee_id } = body;
            const dummyData = {
                collect_id: '67f616ce02821266c233317f',
                amount: 1,
                status: 'SUCCESS',
                trustee_id: '65d43e124174f07e3e3f8966',
                school_id: '65d443168b8aa46fcb5af3e6',
                req_webhook_urls: [
                    'https://webhook.site/481f98b3-83df-49a5-9c7b-b8d024185556',
                ],
                custom_order_id: '',
                createdAt: '2025-04-09T06:42:22.542Z',
                transaction_time: '2025-04-09T06:42:31.000Z',
                additional_data: '{"student_details":{"student_id":"s123456","student_email":"testing","student_name":"test name","receipt":"r12"},"additional_fields":{"uid":"11111"}}',
                formattedTransactionDate: '2025-04-09',
                details: '{"upi":{"channel":null,"upi_id":"rajpbarmaiya@axl"}}',
                transaction_amount: 1.02,
                bank_reference: '892748464830',
                payment_method: 'upi',
                payment_details: '{"upi":{"channel":null,"upi_id":"rajpbarmaiya@axl"}}',
                jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0X2lkIjoiNjdmNjE2Y2UwMjgyMTI2NmMyMzMzMTdlIiwiYW1vdW50IjoxLCJzdGF0dXMiOiJTVUNDRVNTIiwidHJ1c3RlZV9pZCI6IjY1ZDQzZTEyNDE3NGYwN2UzZTNmODk2NyIsInNjaG9vbF9pZCI6IjY1ZDQ0MzE2OGI4YWE0NmZjYjVhZjNlNCIsInJlcV93ZWJob29rX3VybHMiOlsiaHR0cHM6Ly93ZWJob29rLnNpdGUvNDgxZjk4YjMtODNkZi00OWE1LTljN2ItYjhkMDI0MTg1NTU2IiwiZGVmIiwiaHR0cHM6Ly93d3cueWFob28uY29tIiwiaHR0cHM6Ly93d3cuaW5zdGEzNjUuY29tIiwiaHR0cHM6Ly9wYXJ0bmVyLmVkdmlyb24uY29tL2RldiJdLCJjdXN0b21fb3JkZXJfaWQiOiIiLCJjcmVhdGVkQXQiOiIyMDI1LTA0LTA5VDA2OjQyOjIyLjU0MloiLCJ0cmFuc2FjdGlvbl90aW1lIjoiMjAyNS0wNC0wOVQwNjo0MjozMS4wMDBaIiwiYWRkaXRpb25hbF9kYXRhIjoie1wic3R1ZGVudF9kZXRhaWxzXCI6e1wic3R1ZGVudF9pZFwiOlwiczEyMzQ1NlwiLFwic3R1ZGVudF9lbWFpbFwiOlwidGVzdGluZ1wiLFwic3R1ZGVudF9uYW1lXCI6XCJ0ZXN0IG5hbWVcIixcInJlY2VpcHRcIjpcInIxMlwifSxcImFkZGl0aW9uYWxfZmllbGRzXCI6e1widWlkXCI6XCIxMTExMVwifX0iLCJmb3JtYXR0ZWRUcmFuc2FjdGlvbkRhdGUiOiIyMDI1LTA0LTA5IiwiZGV0YWlscyI6IntcInVwaVwiOntcImNoYW5uZWxcIjpudWxsLFwidXBpX2lkXCI6XCJyYWpwYmFybWFpeWFAYXhsXCJ9fSIsInRyYW5zYWN0aW9uX2Ftb3VudCI6MS4wMiwiYmFua19yZWZlcmVuY2UiOiI4OTI3NDg0NjQ4MzAiLCJwYXltZW50X21ldGhvZCI6InVwaSIsInBheW1lbnRfZGV0YWlscyI6IntcInVwaVwiOntcImNoYW5uZWxcIjpudWxsLFwidXBpX2lkXCI6XCJyYWpwYmFybWFpeWFAYXhsXCJ9fSJ9.Bfp9R1oaHYaD6MjCb2frfaEJfh09mJs4GF6xiXSMFXc',
            };
            const webHookData = await (0, sign_1.sign)(dummyData);
            let webhook_key = null;
            try {
                const token = _jwt.sign({ trustee_id: '65d43e124174f07e3e3f8966' }, process.env.KEY);
                const config = {
                    method: 'get',
                    maxBodyLength: Infinity,
                    url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-webhook-key?token=${token}&trustee_id=${'65d43e124174f07e3e3f8966'}`,
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                    },
                };
                const { data } = await axios_1.default.request(config);
                webhook_key = data?.webhook_key;
            }
            catch (error) {
                console.error('Error getting webhook key:', error.message);
            }
            let base64Header = '';
            if (webhook_key) {
                base64Header = 'Basic ' + Buffer.from(webhook_key).toString('base64');
            }
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: url,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    authorization: base64Header,
                },
                data: webHookData,
            };
            const res = await axios_1.default.request(config);
            return res.data;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async approve(body) {
        try {
            const payload = await this.cashfreeService.getMerchantInfo(body.school_id, body.kyc_mail);
            const { merchant_id, merchant_email, merchant_name, poc_phone, merchant_site_url, business_details, website_details, bank_account_details, signatory_details, } = payload;
            return await this.cashfreeService.createMerchant(merchant_id, merchant_email, merchant_name, poc_phone, merchant_site_url, business_details, website_details, bank_account_details, signatory_details);
        }
        catch (e) {
            if (e.response?.data) {
                console.log(e.response.data);
                throw new common_1.BadRequestException(e.response.data.message);
            }
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async initiategatewayKyc(body) {
        const { school_id, kyc_mail, gateway } = body;
        try {
            if (gateway === 'CASHFREE') {
                return await this.cashfreeService.initiateMerchantOnboarding(school_id, kyc_mail);
            }
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async genSchoolReport(body) {
        const { school_id, start_date, end_date } = body;
        const startOfDayUTC = new Date(await this.edvironPgService.convertISTStartToUTC(start_date));
        const endOfDayUTC = new Date(await this.edvironPgService.convertISTEndToUTC(end_date));
        try {
            const aggregation = await this.databaseService.CollectRequestModel.aggregate([
                {
                    $match: {
                        school_id,
                    },
                },
                {
                    $lookup: {
                        from: 'collectrequeststatuses',
                        localField: '_id',
                        foreignField: 'collect_id',
                        as: 'result',
                    },
                },
                { $unwind: '$result' },
                {
                    $match: {
                        'result.status': { $in: ['success', 'SUCCESS'] },
                        $or: [
                            {
                                'result.payment_time': {
                                    $ne: null,
                                    $gte: startOfDayUTC,
                                    $lte: endOfDayUTC,
                                },
                            },
                            {
                                'result.payment_time': { $eq: null },
                            },
                            {
                                'result.updatedAt': {
                                    $gte: startOfDayUTC,
                                    $lte: endOfDayUTC,
                                },
                            },
                        ],
                    },
                },
                {
                    $addFields: {
                        year: { $year: '$result.updatedAt' },
                        month: { $month: '$result.updatedAt' },
                    },
                },
                {
                    $group: {
                        _id: { year: '$year', month: '$month' },
                        totalTransactions: { $sum: 1 },
                        totalVolume: { $sum: '$result.transaction_amount' },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
            ]);
            const monthlyMap = new Map();
            let yearlyTotalTransactions = 0;
            let yearlyTotalVolume = 0;
            aggregation.forEach((item) => {
                const key = `${item._id.year}-${item._id.month}`;
                monthlyMap.set(key, item);
                yearlyTotalTransactions += item.totalTransactions;
                yearlyTotalVolume += item.totalVolume;
            });
            const start = new Date(start_date);
            const end = new Date(end_date);
            const monthlyReport = [];
            const current = new Date(start.getFullYear(), start.getMonth(), 1);
            const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
            while (current <= endMonth) {
                const year = current.getFullYear();
                const month = current.getMonth() + 1;
                const key = `${year}-${month}`;
                if (monthlyMap.has(key)) {
                    monthlyReport.push(monthlyMap.get(key));
                }
                else {
                    monthlyReport.push({
                        _id: { year, month },
                        totalTransactions: 0,
                        totalVolume: 0,
                    });
                }
                current.setMonth(current.getMonth() + 1);
            }
            return {
                yearlyTotal: {
                    totalTransactions: yearlyTotalTransactions,
                    totalVolume: yearlyTotalVolume,
                },
                monthlyReport,
            };
        }
        catch (e) {
            console.error('Error generating report:', e.message);
            return { error: 'Failed to generate report' };
        }
    }
    async bulkTransactionsSubtrustee(body, res, req) {
        console.time('bulk-transactions-report');
        const { trustee_id, token, searchParams, isCustomSearch, seachFilter, isQRCode, gateway, school_id } = body;
        let { payment_modes } = body;
        if (!token)
            throw new Error('Token not provided');
        if (payment_modes?.includes('upi')) {
            payment_modes = [...payment_modes, 'upi_credit_card'];
        }
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const status = req.query.status || null;
            const startOfDayUTC = new Date(await this.edvironPgService.convertISTStartToUTC(startDate));
            const endOfDayUTC = new Date(await this.edvironPgService.convertISTEndToUTC(endDate));
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            let collectQuery = {
                trustee_id: trustee_id,
                createdAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                },
            };
            if (seachFilter === 'student_info') {
                collectQuery = {
                    trustee_id: trustee_id,
                    additional_data: { $regex: searchParams, $options: 'i' },
                };
            }
            if (school_id && school_id.length > 0) {
                collectQuery = {
                    ...collectQuery,
                    school_id: { $in: school_id },
                };
            }
            if (isQRCode) {
                collectQuery = {
                    ...collectQuery,
                    isQRPayment: true,
                };
            }
            if (gateway) {
                collectQuery = {
                    ...collectQuery,
                    gateway: { $in: gateway },
                };
            }
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
            console.time('fetching all transaction');
            const orders = await this.databaseService.CollectRequestModel.find(collectQuery).select('_id');
            let transactions = [];
            const orderIds = orders.map((order) => order._id);
            console.timeEnd('fetching all transaction');
            let query = {
                collect_id: { $in: orderIds },
            };
            if (startDate && endDate) {
                query = {
                    ...query,
                    $or: [
                        {
                            payment_time: {
                                $ne: null,
                                $gte: startOfDayUTC,
                                $lt: endOfDayUTC,
                            },
                        },
                        {
                            $and: [
                                { payment_time: { $eq: null } },
                                {
                                    updatedAt: {
                                        $gte: startOfDayUTC,
                                        $lt: endOfDayUTC,
                                    },
                                },
                            ],
                        },
                    ],
                };
            }
            console.log(`getting transaction`);
            if (status === 'SUCCESS' ||
                status === 'PENDING' ||
                status === 'USER_DROPPED') {
                query = {
                    ...query,
                    status: { $in: [status.toLowerCase(), status.toUpperCase()] },
                };
            }
            else if (status === 'FAILED') {
                query = {
                    ...query,
                    status: { $in: ['FAILED', 'FAILURE', 'failure'] },
                };
            }
            if (payment_modes) {
                query = {
                    ...query,
                    payment_method: { $in: payment_modes },
                };
            }
            if (seachFilter === 'upi_id') {
                query = {
                    ...query,
                    details: { $regex: searchParams },
                };
            }
            if (seachFilter === 'bank_reference') {
                const newOrders = await this.databaseService.CollectRequestStatusModel.findOne({
                    bank_reference: { $regex: searchParams },
                });
                if (!newOrders)
                    throw new common_1.NotFoundException('No record found for Input');
                const request = await this.databaseService.CollectRequestModel.findOne({
                    _id: newOrders.collect_id,
                    trustee_id,
                });
                if (!request) {
                    throw new common_1.NotFoundException('No record found for Input');
                }
                query = {
                    collect_id: newOrders.collect_id,
                };
            }
            console.time('aggregating transaction');
            if (seachFilter === 'order_id' ||
                seachFilter === 'custom_order_id' ||
                seachFilter === 'student_info') {
                console.log('Serching custom');
                let searchIfo = {};
                let findQuery = {
                    trustee_id,
                };
                if (school_id && school_id.length > 0) {
                    findQuery = {
                        ...findQuery,
                        school_id: { $in: school_id },
                    };
                }
                if (seachFilter === 'order_id') {
                    findQuery = {
                        ...findQuery,
                        _id: new mongoose_1.Types.ObjectId(searchParams),
                    };
                    const checkReq = await this.databaseService.CollectRequestModel.findOne(findQuery);
                    if (!checkReq)
                        throw new common_1.NotFoundException('No record found for Input');
                    searchIfo = {
                        collect_id: new mongoose_1.Types.ObjectId(searchParams),
                    };
                }
                else if (seachFilter === 'custom_order_id') {
                    findQuery = {
                        ...findQuery,
                        custom_order_id: searchParams,
                    };
                    const requestInfo = await this.databaseService.CollectRequestModel.findOne(findQuery);
                    if (!requestInfo)
                        throw new common_1.NotFoundException('No record found for Input');
                    searchIfo = {
                        collect_id: requestInfo._id,
                    };
                }
                else if (seachFilter === 'student_info') {
                    const studentRegex = {
                        $regex: searchParams,
                        $options: 'i',
                    };
                    const requestInfo = await this.databaseService.CollectRequestModel.find({
                        trustee_id: trustee_id,
                        additional_data: { $regex: searchParams, $options: 'i' },
                    })
                        .sort({ createdAt: -1 })
                        .select('_id');
                    if (!requestInfo)
                        throw new common_1.NotFoundException(`No record found for ${searchParams}`);
                    const requestId = requestInfo.map((order) => order._id);
                    searchIfo = {
                        collect_id: { $in: requestId },
                    };
                }
                transactions =
                    await this.databaseService.CollectRequestStatusModel.aggregate([
                        {
                            $match: searchIfo,
                        },
                        { $sort: { createdAt: -1 } },
                        {
                            $skip: (page - 1) * limit,
                        },
                        { $limit: Number(limit) },
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
                                'collect_request.amount': 0,
                                'collect_request.trustee_id': 0,
                                'collect_request.sdkPayment': 0,
                                'collect_request.payment_data': 0,
                                'collect_request.ccavenue_merchant_id': 0,
                                'collect_request.ccavenue_access_code': 0,
                                'collect_request.ccavenue_working_key': 0,
                                'collect_request.easebuzz_sub_merchant_id': 0,
                                'collect_request.paymentIds': 0,
                                'collect_request.deepLink': 0,
                                isVBAPaymentComplete: 0,
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
                                isAutoRefund: 1,
                                payment_time: 1,
                                reason: 1,
                                capture_status: 1,
                                currency: 1,
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
                                            currency: '$currency',
                                            createdAt: '$createdAt',
                                            updatedAt: '$updatedAt',
                                            transaction_time: '$updatedAt',
                                            custom_order_id: '$collect_request.custom_order_id',
                                            isSplitPayments: '$collect_request.isSplitPayments',
                                            vendors_info: '$collect_request.vendors_info',
                                            isAutoRefund: '$isAutoRefund',
                                            payment_time: '$payment_time',
                                            isQRPayment: '$collect_request.isQRPayment',
                                            reason: '$reason',
                                            gateway: '$gateway',
                                            capture_status: '$capture_status',
                                            isVBAPaymentComplete: '$isVBAPaymentComplete',
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
                    ]);
            }
            else {
                transactions =
                    await this.databaseService.CollectRequestStatusModel.aggregate([
                        {
                            $match: query,
                        },
                        { $sort: { createdAt: -1 } },
                        {
                            $skip: (page - 1) * limit,
                        },
                        { $limit: Number(limit) },
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
                                'collect_request.amount': 0,
                                'collect_request.trustee_id': 0,
                                'collect_request.sdkPayment': 0,
                                'collect_request.payment_data': 0,
                                'collect_request.ccavenue_merchant_id': 0,
                                'collect_request.ccavenue_access_code': 0,
                                'collect_request.ccavenue_working_key': 0,
                                'collect_request.easebuzz_sub_merchant_id': 0,
                                'collect_request.paymentIds': 0,
                                'collect_request.deepLink': 0,
                                isVBAPaymentComplete: 0,
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
                                isAutoRefund: 1,
                                payment_time: 1,
                                reason: 1,
                                capture_status: 1,
                                currency: 1,
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
                                            createdAt: '$createdAt',
                                            updatedAt: '$updatedAt',
                                            transaction_time: '$updatedAt',
                                            custom_order_id: '$collect_request.custom_order_id',
                                            isSplitPayments: '$collect_request.isSplitPayments',
                                            vendors_info: '$collect_request.vendors_info',
                                            isAutoRefund: '$isAutoRefund',
                                            payment_time: '$payment_time',
                                            reason: '$reason',
                                            gateway: '$gateway',
                                            capture_status: '$capture_status',
                                            isVBAPaymentComplete: '$isVBAPaymentComplete',
                                            currency: '$currency',
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
            }
            console.timeEnd('aggregating transaction');
            console.time('counting');
            const tnxCount = await this.databaseService.CollectRequestStatusModel.countDocuments(query);
            console.timeEnd('counting');
            console.timeEnd('bulk-transactions-report');
            res.status(201).send({ transactions, totalTransactions: tnxCount });
        }
        catch (error) {
            console.log(error.message);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getVba(collect_id) {
        try {
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                return {
                    isSchoolVBA: false,
                    isStudentVBA: false,
                    virtual_account_number: '',
                    virtual_account_ifsc: '',
                    finalAmount: 0,
                    beneficiary_bank_and_address: '',
                    beneficiary_name: '',
                    refrence_no: collect_id,
                    transaction_id: collect_id,
                    cutomer_name: '',
                    cutomer_no: '',
                    customer_email: '',
                    customer_id: '',
                    isSplit: false
                };
            }
            if (!request.additional_data) {
                return {
                    isSchoolVBA: false,
                    isStudentVBA: false,
                    virtual_account_number: '',
                    virtual_account_ifsc: '',
                    finalAmount: 0,
                    beneficiary_bank_and_address: '',
                    beneficiary_name: '',
                    refrence_no: collect_id,
                    transaction_id: collect_id,
                    cutomer_name: '',
                    cutomer_no: '',
                    customer_email: '',
                    customer_id: '',
                    isSplit: request.isSplitPayments || false
                };
            }
            const student_info = JSON.parse(request.additional_data);
            const student_id = student_info.student_details?.student_id;
            const vba_account_number = request.vba_account_number;
            if (!vba_account_number) {
                return {
                    isSchoolVBA: false,
                    isStudentVBA: false,
                    virtual_account_number: '',
                    virtual_account_ifsc: '',
                    finalAmount: 0,
                    beneficiary_bank_and_address: '',
                    beneficiary_name: '',
                    refrence_no: collect_id,
                    transaction_id: collect_id,
                    cutomer_name: '',
                    cutomer_no: '',
                    customer_email: '',
                    customer_id: '',
                    isSplit: request.isSplitPayments || false
                };
            }
            const payload = { vba_account_number: request.vba_account_number };
            const token = jwt.sign(payload, process.env.PAYMENTS_SERVICE_SECRET, {
                noTimestamp: true,
            });
            const config = {
                method: 'get',
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/get-student-vba?student_id=${student_id}&token=${token}&vba_account_number=${request.vba_account_number}&amount=${request.amount}&collect_id=${collect_id}&school_id=${request.school_id}`,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            const { data: response } = await axios_1.default.request(config);
            return response;
        }
        catch (e) {
            return {
                isSchoolVBA: false,
                isStudentVBA: false,
                virtual_account_number: '',
                virtual_account_ifsc: '',
                finalAmount: 0,
                beneficiary_bank_and_address: '',
                beneficiary_name: '',
                refrence_no: collect_id,
                transaction_id: collect_id,
                cutomer_name: '',
                cutomer_no: '',
                customer_email: '',
                customer_id: '',
                isSplit: false
            };
        }
    }
    async getDisputesbyOrderId(collect_id) {
        try {
            if (!collect_id) {
                throw new common_1.BadRequestException('send all details');
            }
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: request._id,
            });
            if (!requestStatus) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            const client_id = request.clientId;
            const cashfreeConfig = {
                method: 'get',
                url: `https://api.cashfree.com/pg/orders/${request._id}/disputes`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': client_id,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
            };
            const cashfreeResponse = await axios_1.default.request(cashfreeConfig);
            return {
                data: {
                    cashfreeDispute: cashfreeResponse.data,
                    custom_order_id: request.custom_order_id,
                    collect_id: collect_id,
                    school_id: request.school_id,
                    trustee_id: request.trustee_id,
                    gateway: request.gateway,
                    bank_reference: requestStatus.bank_reference,
                    student_detail: request.additional_data,
                },
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error('Axios Error:', error.response?.data || error.message);
                throw new common_1.BadRequestException(`External API error: ${error.response?.data?.message || error.message}`);
            }
            console.error('Internal Error:', error.message);
            throw new common_1.InternalServerErrorException(error.message || 'Something went wrong');
        }
    }
    async sendMailAfterTransaction(body) {
        const { collect_id } = body;
        try {
            if (!collect_id) {
                throw new common_1.BadRequestException('Collect ID is required');
            }
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.NotFoundException('Collect Request not found');
            }
            const getTransactionInfo = await this.edvironPgService.getSingleTransactionInfo(collect_id);
            if (!getTransactionInfo) {
                throw new common_1.NotFoundException('Transaction not found');
            }
            try {
                const config = {
                    url: `${process.env.VANILLA_SERVICE_ENDPOINT}/business-alarm/send-mail-after-transaction`,
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: getTransactionInfo[0],
                };
                const response = await axios_1.default.request(config);
            }
            catch (error) {
                console.error('Error sending email:', error.message);
                throw new common_1.BadRequestException('Failed to send email');
            }
            return 'Mail Send Successfully';
        }
        catch (e) {
            console.error(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async updateEasebuzzAmount(body) {
        const { key, merchant_email, start_date, end_date, submerchant_id, school_id, salt, trustee_id, } = body;
        try {
            if (!key ||
                !merchant_email ||
                !start_date ||
                !end_date ||
                !school_id ||
                !salt ||
                !trustee_id) {
                throw new common_1.BadRequestException('Missing required parameters');
            }
            const hashString = `${key}|${merchant_email}|${start_date}|${end_date}|${salt}`;
            const hashValue = await (0, sign_1.calculateSHA512Hash)(hashString);
            const requestData = {
                key,
                hash: hashValue,
                merchant_email,
                date_range: {
                    start_date,
                    end_date,
                },
                submerchant_id,
            };
            const fetchAndSave = async (requestData) => {
                const config = {
                    method: 'post',
                    url: 'https://dashboard.easebuzz.in/transaction/v2/retrieve/date',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    data: requestData,
                };
                const { data } = await axios_1.default.request(config);
                const paymentData = data.data;
                for (const item of paymentData) {
                    const response = await this.edvironPgService.retriveEasebuzz(item.txnid, key, salt);
                    const data = response.msg[0];
                    const studentDetail = {
                        student_details: {
                            student_id: 'N/A',
                            student_email: data.email || 'N/A',
                            student_name: data.firstname || 'N/A',
                            student_phone_no: data.phone || 'N/A',
                            additional_fields: {},
                        },
                    };
                    const collectRequest = new this.databaseService.CollectRequestModel({
                        amount: data.amount,
                        gateway: collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ,
                        easebuzz_sub_merchant_id: data.key,
                        custom_order_id: data.txnid,
                        additional_data: JSON.stringify(studentDetail),
                        school_id: school_id,
                        trustee_id: trustee_id,
                    });
                    const mode = data.mode;
                    let platform_type = '';
                    let payment_method = '';
                    let details;
                    switch (mode) {
                        case 'UPI':
                            payment_method = 'upi';
                            platform_type = 'UPI';
                            details = {
                                app: {
                                    channel: 'NA',
                                    upi_id: data.upi_va,
                                },
                            };
                            break;
                        case 'DC':
                            payment_method = 'debit_card';
                            platform_type = 'DeditCard';
                            details = {
                                card: {
                                    card_bank_name: 'NA',
                                    card_network: data.network || 'N/A',
                                    card_number: data.cardnum,
                                    card_type: 'debit_card',
                                },
                            };
                            break;
                        case 'CC':
                            payment_method = 'crebit_card';
                            platform_type = 'CreditCard';
                            details = {
                                card: {
                                    card_bank_name: 'NA',
                                    card_network: data.network || 'N/A',
                                    card_number: data.cardnum,
                                    card_type: 'crebit_card',
                                },
                            };
                            break;
                        default:
                            details = {};
                    }
                    const collectRequestStatus = new this.databaseService.CollectRequestStatusModel({
                        order_amount: data.amount,
                        transaction_amount: data.net_amount_debit,
                        payment_method: payment_method || data.mode.toLowerCase() || '',
                        status: data.status.toUpperCase() || '',
                        collect_id: collectRequest._id,
                        payment_message: data.payment_message || '',
                        payment_time: new Date(data.addedon),
                        bank_reference: data.bank_ref_num || '',
                        details: JSON.stringify(details),
                    });
                }
                if (data.next) {
                    requestData.page = data.next;
                    await fetchAndSave(requestData);
                }
                return;
            };
            await fetchAndSave(requestData);
            return { message: 'All pages fetched and data saved successfully' };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async retriveEasebuzz(body) {
        const { txnid, key } = body;
        const salt = process.env.EASEBUZZ_SALT || '';
        const hashString = `${key}|${txnid}|${salt}`;
        const hashValue = await (0, sign_1.calculateSHA512Hash)(hashString);
        try {
            const requestData = {
                txnid,
                key,
                hash: hashValue,
            };
            const config = {
                method: 'post',
                url: 'https://dashboard.easebuzz.in/transaction/v2.1/retrieve',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                data: requestData,
            };
            const { data } = await axios_1.default.request(config);
            console.log(data);
            return data;
        }
        catch (error) { }
    }
    async setMdrZero(body) {
        try {
            const reset = await this.databaseService.PlatformChargeModel.updateMany({ school_id: { $in: body.school_ids } }, { $set: { 'platform_charges.$[].range_charge.$[].charge': 0 } });
            return reset;
        }
        catch (e) { }
    }
    async subTrusteeTransactionsSum(body) {
        try {
            const { trustee_id, school_id, gateway, start_date, end_date, status, mode, isQRPayment, } = body;
            const response = await this.edvironPgService.subtrusteeTransactionAggregation(trustee_id, start_date, end_date, school_id, status, mode, isQRPayment, gateway);
            return response;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async webhookTrigger(body) {
        try {
            const { school_ids, start_date, end_date, collect_id } = body;
            const collectRequest = await this.databaseService.CollectRequestModel.find({
                _id: new mongoose_1.Types.ObjectId(collect_id),
            }).select('_id');
            console.log(collectRequest.length);
            const aggregateData = await this.databaseService.CollectRequestStatusModel.aggregate([
                {
                    $match: {
                        collect_id: { $in: collectRequest.map((item) => item._id) },
                        status: { $in: ['success', 'SUCCESS'] },
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
                        collect_id: 1,
                        amount: 1,
                        status: 1,
                        school_id: '$collect_request.school_id',
                        trustee_id: '$collect_request.trustee_id',
                        req_webhook_urls: '$collect_request.req_webhook_urls',
                        custom_order_id: '$collect_request.custom_order_id',
                        createdAt: 1,
                        transaction_time: '$payment_time',
                        additional_data: '$collect_request.additional_data',
                        details: 1,
                        transaction_amount: 1,
                        bank_reference: 1,
                        payment_method: 1,
                    },
                },
            ]);
            let successCount = 0;
            let failCount = 0;
            let noUrlCount = 0;
            await Promise.all(aggregateData.map(async (item) => {
                if (item?.req_webhook_urls && item?.req_webhook_urls?.length > 0) {
                    for (const url of item.req_webhook_urls) {
                        try {
                            const uptDate = moment(item.transaction_time);
                            const istDate = uptDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
                            const payload = {
                                collect_id: item.collect_id,
                                amount: item.amount,
                                status: item.status,
                                trustee_id: item.trustee_id,
                                school_id: item.school_id,
                                req_webhook_urls: item.req_webhook_urls,
                                custom_order_id: item.custom_order_id,
                                createdAt: item.createdAt,
                                transaction_time: item.transaction_time,
                                additional_data: item.additional_data,
                                formattedTransactionDate: istDate,
                                transaction_amount: item.transaction_amount,
                                bank_reference: item.bank_reference,
                                payment_method: item.payment_method,
                                payment_details: item.details,
                                details: item.details ? JSON.parse(item.details) : {},
                            };
                            const config = {
                                method: 'post',
                                url: url,
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${process.env.WEBHOOK_SECRET}`,
                                },
                                data: payload,
                            };
                            try {
                                const response = await axios_1.default.request(config);
                                successCount++;
                                console.log(response.data, 'response from webhook for collect_id:', item.collect_id, 'url:', url);
                            }
                            catch (e) {
                                failCount++;
                                console.log('Error in webhook for collect_id:', item.collect_id, 'url:', url, e.message);
                            }
                        }
                        catch (e) {
                            console.log('Error in webhook for collect_id:', item.collect_id, 'url:', url, e.message);
                        }
                    }
                }
                else {
                    console.log('No webhook url found for collect_id:', item.collect_id);
                    noUrlCount++;
                }
            }));
            return {
                length: aggregateData.length,
                successCount,
                failCount,
                noUrlCount,
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async orderDetail(collect_id) {
        try {
            const collect_request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collect_request) {
                throw new common_1.BadRequestException('Order not found');
            }
            return {
                razorpay_seamless: collect_request.razorpay_seamless,
                additional_data: collect_request.additional_data,
                amount: collect_request.amount,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error);
        }
    }
    async rzpOrderDetail(order_id) {
        try {
            const collect_request = await this.databaseService.CollectRequestModel.findOne({
                'razorpay_seamless.order_id': order_id,
            });
            if (!collect_request) {
                throw new common_1.BadRequestException('Order not found');
            }
            return {
                razorpay_seamless: collect_request.razorpay_seamless,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error);
        }
    }
    async updateCashfreeWebhook2() {
        try {
            const startDate = new Date(await this.edvironPgService.convertISTStartToUTC('2025-10-17'));
            const endDate = new Date();
            const collectRequests = await this.databaseService.CollectRequestModel.aggregate([
                {
                    $match: {
                        gateway: 'EDVIRON_PG',
                        createdAt: { $gte: startDate, $lte: endDate },
                    },
                },
                {
                    $lookup: {
                        from: 'collectrequeststatuses',
                        let: { collectId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$collect_id', '$$collectId'] },
                                            { $in: ['$status', ['PENDING', 'USER_DROPPED']] },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: 'statuses',
                    },
                },
                { $unwind: { path: '$statuses', preserveNullAndEmptyArrays: false } },
                {
                    $project: {
                        _id: 1,
                        gateway: 1,
                        createdAt: 1,
                        payment_id: 1,
                        'statuses.status': 1,
                        'statuses.updatedAt': 1,
                        'statuses.payment_time': 1,
                    },
                },
            ]);
            const concurrencyLimit = 10;
            const chunks = [];
            for (let i = 0; i < collectRequests.length; i += concurrencyLimit) {
                chunks.push(collectRequests.slice(i, i + concurrencyLimit));
            }
            for (const chunk of chunks) {
                await Promise.all(chunk.map(async (request) => {
                    const collectRequestId = request._id.toString();
                    const config = {
                        url: `http://localhost:4001/check-status?transactionId=${collectRequestId}`,
                        method: 'get',
                    };
                    try {
                        const statusResponse = await axios_1.default.request(config);
                        if (statusResponse.data.statusCode === '400')
                            return;
                        const statusData = statusResponse.data;
                        const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOneAndUpdate({ collect_id: new mongoose_1.Types.ObjectId(collectRequestId) }, {
                            $set: {
                                status: statusData.status,
                                transaction_amount: statusData.transaction_amount,
                                updatedAt: new Date(statusData.details.transaction_time),
                                payment_method: statusData.details.payment_mode,
                                details: JSON.stringify(statusData.details.payment_methods),
                                bank_reference: statusData.details.bank_ref,
                                payment_time: statusData.details.transaction_time,
                                reason: statusData.payment_message || 'NA',
                                payment_message: statusData.payment_message || 'NA',
                                error_details: {
                                    error_description: 'NA',
                                    error_source: 'NA',
                                    error_reason: 'NA',
                                },
                            },
                        }, { upsert: true, new: true });
                        const collectReq = await this.databaseService.CollectRequestModel.findById(collectRequestId);
                        if (!collectReq)
                            return;
                        const payment_time = collectRequestStatus.payment_time;
                        const webHookDataInfo = {
                            collect_id: collectRequestId,
                            amount: collectReq.amount,
                            status: collectRequestStatus.status,
                            trustee_id: collectReq.trustee_id,
                            school_id: collectReq.school_id,
                            req_webhook_urls: collectReq.req_webhook_urls,
                            custom_order_id: collectReq.custom_order_id,
                            createdAt: collectRequestStatus.createdAt,
                            transaction_time: collectRequestStatus.updatedAt,
                            additional_data: collectReq.additional_data,
                            details: collectRequestStatus.details,
                            transaction_amount: collectRequestStatus.transaction_amount,
                            bank_reference: collectRequestStatus.bank_reference,
                            payment_method: collectRequestStatus.payment_method,
                            payment_details: collectRequestStatus.details,
                            formattedDate: `${payment_time.getFullYear()}-${String(payment_time.getMonth() + 1).padStart(2, '0')}-${String(payment_time.getDate()).padStart(2, '0')}`,
                        };
                        let webhook_key = null;
                        const webHookUrl = collectReq.req_webhook_urls;
                        if (webHookUrl) {
                            const token = jwt.sign({ trustee_id: collectReq.trustee_id.toString() }, process.env.KEY);
                            const { data } = await axios_1.default.get(`${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-webhook-key`, {
                                params: {
                                    token,
                                    trustee_id: collectReq.trustee_id.toString(),
                                },
                                headers: { accept: 'application/json' },
                            });
                            webhook_key = data?.webhook_key;
                        }
                        if (collectReq.trustee_id.toString() === '66505181ca3e97e19f142075') {
                            setTimeout(() => this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo, webhook_key)
                                .catch(() => { }), 60000);
                        }
                        else {
                            await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo, webhook_key);
                        }
                        try {
                            const pgData = JSON.parse(collectRequestStatus.details);
                            const platformMap = {
                                net_banking: pgData?.netbanking?.netbanking_bank_name || 'Others',
                                debit_card: pgData?.card?.card_network || 'Others',
                                credit_card: pgData?.card?.card_network || 'Others',
                                upi: 'Others',
                                wallet: pgData?.app?.provider || 'Others',
                                cardless_emi: 'Others',
                                pay_later: pgData?.pay_later?.provider || 'Others',
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
                            const meth = platformMap[collectRequestStatus.payment_method];
                            const mode = methodMap[collectRequestStatus.payment_method];
                            const tokenData = {
                                school_id: collectReq.school_id,
                                trustee_id: collectReq.trustee_id,
                                order_amount: collectReq.amount,
                                transaction_amount: collectRequestStatus.transaction_amount,
                                platform_type: meth,
                                payment_mode: mode,
                                collect_id: collectReq._id,
                            };
                            const commissionToken = jwt.sign(tokenData, process.env.KEY, { noTimestamp: true });
                            await axios_1.default.post(`${process.env.VANILLA_SERVICE_ENDPOINT}/erp/add-commission`, {
                                token: commissionToken,
                                ...tokenData,
                            }, {
                                headers: {
                                    accept: 'application/json',
                                    'content-type': 'application/json',
                                    'x-api-version': '2023-08-01',
                                },
                            });
                        }
                        catch {
                            console.log('failed to save commission for', collectRequestId);
                        }
                    }
                    catch {
                    }
                }));
            }
            return { count: collectRequests.length };
        }
        catch {
            throw new common_1.InternalServerErrorException('Cashfree update failed');
        }
    }
    async updateCashfreeWebhook2Cron() {
        try {
            const startDate = new Date(await this.edvironPgService.convertISTStartToUTC('2025-10-17'));
            const endDate = new Date();
            const collectRequests = await this.databaseService.CollectRequestModel.aggregate([
                {
                    $match: {
                        gateway: 'EDVIRON_PG',
                        createdAt: { $gte: startDate, $lte: endDate },
                    },
                },
                {
                    $lookup: {
                        from: 'collectrequeststatuses',
                        let: { collectId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$collect_id', '$$collectId'] },
                                            { $in: ['$status', ['PENDING', 'USER_DROPPED']] },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: 'statuses',
                    },
                },
                { $unwind: { path: '$statuses', preserveNullAndEmptyArrays: false } },
                {
                    $project: {
                        _id: 1,
                        gateway: 1,
                        createdAt: 1,
                        payment_id: 1,
                        'statuses.status': 1,
                        'statuses.updatedAt': 1,
                        'statuses.payment_time': 1,
                    },
                },
            ]);
            const concurrencyLimit = 10;
            const chunks = [];
            for (let i = 0; i < collectRequests.length; i += concurrencyLimit) {
                chunks.push(collectRequests.slice(i, i + concurrencyLimit));
            }
            for (const chunk of chunks) {
                await Promise.all(chunk.map(async (request) => {
                    const collectRequestId = request._id.toString();
                    const config = {
                        url: `http://localhost:4001/check-status?transactionId=${collectRequestId}`,
                        method: 'get',
                    };
                    try {
                        const statusResponse = await axios_1.default.request(config);
                        if (statusResponse.data.statusCode === '400')
                            return;
                        const statusData = statusResponse.data;
                        const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOneAndUpdate({ collect_id: new mongoose_1.Types.ObjectId(collectRequestId) }, {
                            $set: {
                                status: statusData.status,
                                transaction_amount: statusData.transaction_amount,
                                updatedAt: new Date(statusData.details.transaction_time),
                                payment_method: statusData.details.payment_mode,
                                details: JSON.stringify(statusData.details.payment_methods),
                                bank_reference: statusData.details.bank_ref,
                                payment_time: statusData.details.transaction_time,
                                reason: statusData.payment_message || 'NA',
                                payment_message: statusData.payment_message || 'NA',
                                error_details: {
                                    error_description: 'NA',
                                    error_source: 'NA',
                                    error_reason: 'NA',
                                },
                            },
                        }, { upsert: true, new: true });
                        const collectReq = await this.databaseService.CollectRequestModel.findById(collectRequestId);
                        if (!collectReq)
                            return;
                        const payment_time = collectRequestStatus.payment_time;
                        const webHookDataInfo = {
                            collect_id: collectRequestId,
                            amount: collectReq.amount,
                            status: collectRequestStatus.status,
                            trustee_id: collectReq.trustee_id,
                            school_id: collectReq.school_id,
                            req_webhook_urls: collectReq.req_webhook_urls,
                            custom_order_id: collectReq.custom_order_id,
                            createdAt: collectRequestStatus.createdAt,
                            transaction_time: collectRequestStatus.updatedAt,
                            additional_data: collectReq.additional_data,
                            details: collectRequestStatus.details,
                            transaction_amount: collectRequestStatus.transaction_amount,
                            bank_reference: collectRequestStatus.bank_reference,
                            payment_method: collectRequestStatus.payment_method,
                            payment_details: collectRequestStatus.details,
                            formattedDate: `${payment_time.getFullYear()}-${String(payment_time.getMonth() + 1).padStart(2, '0')}-${String(payment_time.getDate()).padStart(2, '0')}`,
                        };
                        let webhook_key = null;
                        const webHookUrl = collectReq.req_webhook_urls;
                        if (webHookUrl) {
                            const token = jwt.sign({ trustee_id: collectReq.trustee_id.toString() }, process.env.KEY);
                            const { data } = await axios_1.default.get(`${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-webhook-key`, {
                                params: {
                                    token,
                                    trustee_id: collectReq.trustee_id.toString(),
                                },
                                headers: { accept: 'application/json' },
                            });
                            webhook_key = data?.webhook_key;
                        }
                        if (collectReq.trustee_id.toString() === '66505181ca3e97e19f142075') {
                            setTimeout(() => this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo, webhook_key)
                                .catch(() => { }), 60000);
                        }
                        else {
                            await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo, webhook_key);
                        }
                        try {
                            const pgData = JSON.parse(collectRequestStatus.details);
                            const platformMap = {
                                net_banking: pgData?.netbanking?.netbanking_bank_name || 'Others',
                                debit_card: pgData?.card?.card_network || 'Others',
                                credit_card: pgData?.card?.card_network || 'Others',
                                upi: 'Others',
                                wallet: pgData?.app?.provider || 'Others',
                                cardless_emi: 'Others',
                                pay_later: pgData?.pay_later?.provider || 'Others',
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
                            const meth = platformMap[collectRequestStatus.payment_method];
                            const mode = methodMap[collectRequestStatus.payment_method];
                            const tokenData = {
                                school_id: collectReq.school_id,
                                trustee_id: collectReq.trustee_id,
                                order_amount: collectReq.amount,
                                transaction_amount: collectRequestStatus.transaction_amount,
                                platform_type: meth,
                                payment_mode: mode,
                                collect_id: collectReq._id,
                            };
                            const commissionToken = jwt.sign(tokenData, process.env.KEY, { noTimestamp: true });
                            await axios_1.default.post(`${process.env.VANILLA_SERVICE_ENDPOINT}/erp/add-commission`, {
                                token: commissionToken,
                                ...tokenData,
                            }, {
                                headers: {
                                    accept: 'application/json',
                                    'content-type': 'application/json',
                                    'x-api-version': '2023-08-01',
                                },
                            });
                        }
                        catch {
                            console.log('failed to save commission for', collectRequestId);
                        }
                    }
                    catch {
                    }
                }));
            }
            return { count: collectRequests.length };
        }
        catch {
            throw new common_1.InternalServerErrorException('Cashfree update failed');
        }
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
    (0, common_1.Get)('transaction-info/order'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getTransactionInfoOrder", null);
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
    (0, common_1.Get)('bulk-transactions-report-csv'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "bulkTransactionsCSV", null);
__decorate([
    (0, common_1.Post)('single-transaction-report'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "singleTransactionReport", null);
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
    (0, common_1.Post)('easebuzz/settlement'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "easebuzzSettlement", null);
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
__decorate([
    (0, common_1.Get)('/pg-status'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getPgStatus", null);
__decorate([
    (0, common_1.Post)('/initiate-refund'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "initiaterefund", null);
__decorate([
    (0, common_1.Get)('/refund-status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getRefundStatus", null);
__decorate([
    (0, common_1.Get)('/sent-mail'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "sentMail", null);
__decorate([
    (0, common_1.Post)('/terminate'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "terminate", null);
__decorate([
    (0, common_1.Get)('/get-custom-id'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getCustomId", null);
__decorate([
    (0, common_1.Post)('create-vendor'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "createVendor", null);
__decorate([
    (0, common_1.Get)('get-vendor-status'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "checkVendorStatus", null);
__decorate([
    (0, common_1.Get)('get-vendor-transaction'),
    __param(0, (0, common_1.Query)('vendor_id')),
    __param(1, (0, common_1.Query)('trustee_id')),
    __param(2, (0, common_1.Query)('validate_trustee')),
    __param(3, (0, common_1.Query)('school_id')),
    __param(4, (0, common_1.Query)('collect_id')),
    __param(5, (0, common_1.Query)('token')),
    __param(6, (0, common_1.Query)('limit')),
    __param(7, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "vendorTransactions", null);
__decorate([
    (0, common_1.Post)('get-vendor-transaction'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getVendorTransactions", null);
__decorate([
    (0, common_1.Post)('/vendors-settlement-recon'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "vendorSettlementRecon", null);
__decorate([
    (0, common_1.Get)('upi-pay-qr'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getQRData", null);
__decorate([
    (0, common_1.Get)('/get-transaction-report-batched'),
    __param(0, (0, common_1.Query)('start_date')),
    __param(1, (0, common_1.Query)('end_date')),
    __param(2, (0, common_1.Query)('trustee_id')),
    __param(3, (0, common_1.Query)('school_id')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getTransactionReportBatched", null);
__decorate([
    (0, common_1.Post)('/get-transaction-report-batched'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getTransactionReportBatchedFiltered", null);
__decorate([
    (0, common_1.Post)('/erp-webhook-logs'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getErpWebhookLogs", null);
__decorate([
    (0, common_1.Post)('/save-transactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "saveBatchTransactions", null);
__decorate([
    (0, common_1.Post)('/save-merchant-transactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "saveMerchantBatchTransactions", null);
__decorate([
    (0, common_1.Get)('/get-batch-transactions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getBatchTransactions", null);
__decorate([
    (0, common_1.Post)('fetch-subtrustee-batch-transactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getSubtrusteeBatchTransactions", null);
__decorate([
    (0, common_1.Get)('/get-merchant-batch-transactions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getMerchantBatchTransactions", null);
__decorate([
    (0, common_1.Get)('/get-sub-trustee-batch-transactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getSubTrusteeBatchTransactions", null);
__decorate([
    (0, common_1.Post)('/vendor-transactions-settlement'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "vendorTransactionsSettlement", null);
__decorate([
    (0, common_1.Get)('erp-transaction-info'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getErpTransactionInfo", null);
__decorate([
    (0, common_1.Post)('/payment-capture'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "mannualCapture", null);
__decorate([
    (0, common_1.Post)('/resolve-disputes'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "resolveDisputes", null);
__decorate([
    (0, common_1.Get)('get-order-payment-link'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getPaymentsForOrder", null);
__decorate([
    (0, common_1.Get)('/v2/orders'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "checkStatusV2", null);
__decorate([
    (0, common_1.Get)('settlement-status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getSettlementStatus", null);
__decorate([
    (0, common_1.Post)('get-vendor-single-transaction'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getVendonrSingleTransactions", null);
__decorate([
    (0, common_1.Post)('get-Merchantvendor-single-transaction'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getMerchantVendonrSingleTransactions", null);
__decorate([
    (0, common_1.Post)('/update-school-mdr'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "updateSchoolMdr", null);
__decorate([
    (0, common_1.Get)('/get-payment-mdr'),
    __param(0, (0, common_1.Query)('collect_id')),
    __param(1, (0, common_1.Query)('payment_mode')),
    __param(2, (0, common_1.Query)('platform_type')),
    __param(3, (0, common_1.Query)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getPaymentMdr", null);
__decorate([
    (0, common_1.Post)('/add-charge'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "addCharge", null);
__decorate([
    (0, common_1.Get)('get-collection-disable-modes'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getCollectDisableMode", null);
__decorate([
    (0, common_1.Get)('/get-card-info'),
    __param(0, (0, common_1.Query)('bin')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getCardInfo", null);
__decorate([
    (0, common_1.Post)('/vendor-settlement-reconcilation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "vendorrecon", null);
__decorate([
    (0, common_1.Post)('/test-webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "testWebhook", null);
__decorate([
    (0, common_1.Post)('/approve-submerchant'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('/initiate-kyc'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "initiategatewayKyc", null);
__decorate([
    (0, common_1.Post)('school-report-new'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "genSchoolReport", null);
__decorate([
    (0, common_1.Post)('bulk-transactions-subtrustee-report'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "bulkTransactionsSubtrustee", null);
__decorate([
    (0, common_1.Get)('/vba-details'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getVba", null);
__decorate([
    (0, common_1.Get)('get-dispute-byOrderId'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "getDisputesbyOrderId", null);
__decorate([
    (0, common_1.Post)('sendMail-after-transaction'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "sendMailAfterTransaction", null);
__decorate([
    (0, common_1.Post)('update-easebuz'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "updateEasebuzzAmount", null);
__decorate([
    (0, common_1.Post)('easebuzz-retrive'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "retriveEasebuzz", null);
__decorate([
    (0, common_1.Post)('set-mdr-zero'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "setMdrZero", null);
__decorate([
    (0, common_1.Post)('sub-trustee-transactions-sum'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "subTrusteeTransactionsSum", null);
__decorate([
    (0, common_1.Post)('webhook-trigger'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "webhookTrigger", null);
__decorate([
    (0, common_1.Get)('get-order-detail'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "orderDetail", null);
__decorate([
    (0, common_1.Get)('get-rzporder-detail'),
    __param(0, (0, common_1.Query)('order_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "rzpOrderDetail", null);
__decorate([
    (0, common_1.Post)('update-cashfree2'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "updateCashfreeWebhook2", null);
exports.EdvironPgController = EdvironPgController = __decorate([
    (0, common_1.Controller)('edviron-pg'),
    __metadata("design:paramtypes", [edviron_pg_service_1.EdvironPgService,
        database_service_1.DatabaseService,
        easebuzz_service_1.EasebuzzService,
        cashfree_service_1.CashfreeService,
        nttdata_service_1.NttdataService,
        pos_paytm_service_1.PosPaytmService,
        worldline_service_1.WorldlineService,
        razorpay_nonseamless_service_1.RazorpayNonseamlessService,
        razorpay_service_1.RazorpayService])
], EdvironPgController);
//# sourceMappingURL=edviron-pg.controller.js.map