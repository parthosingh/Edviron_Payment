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
exports.RazorpayNonseamlessController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const database_service_1 = require("../database/database.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const razorpay_nonseamless_service_1 = require("./razorpay-nonseamless.service");
const _jwt = require("jsonwebtoken");
const axios_1 = require("axios");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
let RazorpayNonseamlessController = class RazorpayNonseamlessController {
    constructor(databaseService, razorpayServiceModel, edvironPgService) {
        this.databaseService = databaseService;
        this.razorpayServiceModel = razorpayServiceModel;
        this.edvironPgService = edvironPgService;
    }
    async razorpayRedirect(req, res) {
        try {
            const { collect_id, orderId } = req.query;
            const [request, req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!request || !req_status) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (!request.razorpay.razorpay_id ||
                !request.razorpay.razorpay_mid ||
                !request.razorpay.razorpay_secret) {
                throw new common_1.NotFoundException('Order not found');
            }
            const created_at = new Date(req_status.createdAt).getTime();
            const now = Date.now();
            const expiry_duration = 15 * 60 * 1000;
            if (now - created_at > expiry_duration) {
                return res.send(`
          <script>
            alert('The payment session has expired. Please initiate the payment again.');
            window.location.href = '${process.env.URL}/razorpay-nonseamless/callback?collect_id=${collect_id}';
          </script>
        `);
            }
            const additional_data = JSON.parse(request.additional_data);
            let student_email = additional_data?.student_details?.student_email;
            if (!student_email) {
                student_email = 'testemail@email.com';
            }
            console.log(student_email, 'student_email');
            const student_phone_no = additional_data?.student_details?.student_phone_no || '9876543210';
            const options = {
                key: request.razorpay.razorpay_id,
                amount: request.amount * 100,
                currency: 'INR',
                name: additional_data?.student_details?.student_name || 'Fees Payment',
                description: 'Fees Payment',
                order_id: request.razorpay.order_id,
                callback_url: `${process.env.URL}/razorpay-nonseamless/callback?collect_id=${collect_id}`,
                handler: function (response) {
                    console.log('Payment successful:', response);
                    window.location.href = `${process.env.URL}/razorpay-nonseamless/cancel?collect_id=${collect_id}`;
                },
                prefill: {
                    name: additional_data.student_details.student_name || '',
                    email: student_email,
                    contact: student_phone_no,
                },
                notes: {
                    bookingId: request._id.toString(),
                },
                theme: {
                    color: '#F37254',
                },
                modal: {
                    ondismiss: function () {
                        window.location.href = `${process.env.URL}/razorpay-nonseamless/cancel?collect_id=${collect_id}`;
                    },
                },
            };
            return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Razorpay Payment</title>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        </head>
        <body>
          <script>
            window.onload = function () {
              const options = ${JSON.stringify(options)};
              const rzp = new Razorpay(options);
              rzp.open();
            };
          </script>
        </body>
        </html>
      `);
        }
        catch (error) {
            console.error('Error in razorpayRedirect:', error);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async razorpayRedirectV2(req, res) {
        try {
            const { collect_id, orderId } = req.query;
            const [request, req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!request || !req_status) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (!request.razorpay.razorpay_id ||
                !request.razorpay.razorpay_mid ||
                !request.razorpay.razorpay_secret) {
                throw new common_1.NotFoundException('Order not found');
            }
            const created_at = new Date(req_status.createdAt).getTime();
            const now = Date.now();
            const expiry_duration = 15 * 60 * 1000;
            if (now - created_at > expiry_duration) {
                return res.send(`
          <script>
            alert('The payment session has expired. Please initiate the payment again.');
            window.location.href = '${process.env.URL}/razorpay-nonseamless/callback?collect_id=${collect_id}';
          </script>
        `);
            }
            const additional_data = JSON.parse(request.additional_data);
            let student_email = additional_data?.student_details?.student_email;
            if (!student_email) {
                student_email = 'testemail@email.com';
            }
            console.log(student_email, 'student_email');
            const student_phone_no = additional_data?.student_details?.student_phone_no || '9876543210';
            const options = {
                key: request.razorpay.razorpay_id,
                amount: request.amount * 100,
                currency: 'INR',
                name: additional_data?.student_details?.student_name || 'Fees Payment',
                description: 'Fees Payment',
                order_id: request.razorpay.order_id,
                callback_url: `${process.env.URL}/razorpay-nonseamless/callback?collect_id=${collect_id}`,
                handler: function (response) {
                    console.log('Payment successful:', response);
                    window.location.href = `${process.env.URL}/razorpay-nonseamless/cancel?collect_id=${collect_id}`;
                },
                prefill: {
                    name: additional_data.student_details.student_name || '',
                    email: student_email,
                    contact: student_phone_no,
                },
                notes: {
                    bookingId: request._id.toString(),
                },
                theme: {
                    color: '#F37254',
                },
                modal: {
                    ondismiss: function () {
                        window.location.href = `${process.env.URL}/razorpay-nonseamless/cancel?collect_id=${collect_id}`;
                    },
                },
            };
            return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Razorpay Payment</title>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        </head>
        <body>
          <script>
            window.onload = function () {
              const options = ${JSON.stringify(options)};
              const rzp = new Razorpay(options);
              rzp.open();
            };
          </script>
        </body>
        </html>
      `);
        }
        catch (error) {
            console.error('Error in razorpayRedirect:', error);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async handleCallback(req, res) {
        try {
            const { collect_id } = req.query;
            try {
                const details = JSON.stringify(req.body || {});
                await new this.databaseService.WebhooksModel({
                    body: details,
                    gateway: 'RAZORPAY_CALLBACK_BANK',
                }).save();
            }
            catch (e) {
                console.log(e);
            }
            const [collect_request, collect_req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!collect_request || !collect_req_status) {
                throw new common_1.NotFoundException('Order not found');
            }
            const status = await this.razorpayServiceModel.getPaymentStatus(collect_request.razorpay.order_id.toString(), collect_request);
            let payment_method = status.details.payment_mode || null;
            let payload = status?.details?.payment_methods || {};
            let detail;
            let pg_mode = payment_method;
            console.log(payment_method, 'payment_method');
            switch (payment_method) {
                case 'upi':
                    detail = {
                        upi: {
                            channel: null,
                            upi_id: payload?.upi?.vpa || null,
                        },
                    };
                    break;
                case 'credit':
                    (pg_mode = 'credit_card'), console.log(payload, 'payloadin here');
                    detail = {
                        card: {
                            card_bank_name: payload?.card?.card_type || null,
                            card_country: payload?.card?.card_country || null,
                            card_network: payload?.card?.card_network || null,
                            card_number: payload?.card?.card_number || null,
                            card_sub_type: payload?.card?.card_sub_type || null,
                            card_type: payload?.card?.card_type || null,
                            channel: null,
                        },
                    };
                    break;
                case 'debit':
                    (pg_mode = 'debit_card'),
                        (detail = {
                            card: {
                                card_bank_name: payload?.card?.card_type || null,
                                card_country: payload?.card?.card_country || null,
                                card_network: payload?.card?.card_network || null,
                                card_number: payload?.card?.card_number || null,
                                card_sub_type: payload?.card?.card_sub_type || null,
                                card_type: payload?.card?.card_type || null,
                                channel: null,
                            },
                        });
                    break;
                case 'net_banking':
                    detail = {
                        netbanking: {
                            channel: null,
                            netbanking_bank_code: null,
                            netbanking_bank_name: payload.net_banking.bank || null,
                        },
                    };
                    break;
                case 'wallet':
                    detail = {
                        wallet: {
                            channel: null,
                            provider: payload.wallet.wallet || null,
                        },
                    };
                    break;
                default:
                    detail = {};
            }
            await collect_request.constructor.updateOne({ _id: collect_request._id }, {
                $set: {
                    payment_id: req.body.razorpay_payment_id,
                    'razorpay.payment_id': req.body.razorpay_payment_id,
                    'razorpay.razorpay_signature': req.body.razorpay_signature,
                },
            });
            let payment_status = status.status;
            if (payment_status === collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                collect_req_status.status = collect_req_status_schema_1.PaymentStatus.SUCCESS;
                collect_req_status.bank_reference = status.details?.bank_ref || '';
                collect_req_status.payment_method = pg_mode || '';
                collect_req_status.details =
                    JSON.stringify(status.details?.payment_methods) || '';
                collect_req_status.payment_time =
                    status.details?.transaction_time || '';
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
            const collectIdObject = new mongoose_1.Types.ObjectId(collect_id);
            const transaction_time = status?.details?.transaction_time
                ? new Date(status?.details?.transaction_time)
                : null;
            const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                collect_id: collectIdObject,
            }, {
                $set: {
                    status: status.status,
                    payment_time: transaction_time
                        ? transaction_time.toISOString()
                        : null,
                    transaction_amount: status?.transaction_amount || status?.amount,
                    payment_method: pg_mode || '',
                    details: JSON.stringify(detail),
                    bank_reference: status?.details?.bank_ref || '',
                    reason: status.details?.order_status || '',
                    payment_message: status?.details?.order_status || '',
                },
            }, {
                upsert: true,
                new: true,
            });
            console.log(updateReq, 'updateReq');
            const webhookUrl = collect_request?.req_webhook_urls;
            const transaction_time_str = transaction_time
                ? transaction_time.toISOString()
                : null;
            const webHookDataInfo = {
                collect_id,
                amount: collect_request.amount,
                status: status.status,
                trustee_id: collect_request.trustee_id,
                school_id: collect_request.school_id,
                req_webhook_urls: collect_request?.req_webhook_urls,
                custom_order_id: collect_request?.custom_order_id || null,
                createdAt: collect_req_status?.createdAt,
                transaction_time: transaction_time
                    ? transaction_time.toISOString()
                    : collect_req_status?.updatedAt,
                additional_data: collect_request?.additional_data || null,
                details: collect_req_status.details,
                transaction_amount: status.transaction_amount,
                bank_reference: collect_req_status.bank_reference,
                payment_method: collect_req_status.payment_method,
                payment_details: collect_req_status.details,
                formattedDate: (() => {
                    const rawDate = transaction_time || collect_req_status?.updatedAt;
                    const dateObj = new Date(rawDate || new Date());
                    if (isNaN(dateObj.getTime()))
                        return null;
                    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                })(),
            };
            if (webhookUrl !== null) {
                let webhook_key = null;
                try {
                    const token = _jwt.sign({ trustee_id: collect_request.trustee_id.toString() }, process.env.KEY);
                    const config = {
                        method: 'get',
                        maxBodyLength: Infinity,
                        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-webhook-key?token=${token}&trustee_id=${collect_request.trustee_id.toString()}`,
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
                if (collect_request?.trustee_id.toString() === '66505181ca3e97e19f142075') {
                    setTimeout(async () => {
                        try {
                            await this.edvironPgService.sendErpWebhook(webhookUrl, webHookDataInfo, webhook_key);
                        }
                        catch (e) {
                            console.log(`Error sending webhook to ${webhookUrl}:`, e.message);
                        }
                    }, 60000);
                }
                else {
                    try {
                        await this.edvironPgService.sendErpWebhook(webhookUrl, webHookDataInfo, webhook_key);
                    }
                    catch (e) {
                        console.log(`Error sending webhook to ${webhookUrl}:`, e.message);
                    }
                }
            }
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
    async webhook(body, res) {
        const details = JSON.stringify(body);
        const webhook = await new this.databaseService.WebhooksModel({
            body: details,
            gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
        }).save();
        const { payload } = body;
        const { order_id, amount, method, bank, acquirer_data, error_reason, card, card_id, wallet, } = payload.payment.entity;
        let { status } = payload.payment.entity;
        const { created_at } = payload.payment.entity;
        const { created_at: payment_time, receipt } = payload.order.entity;
        try {
            const collect_id = receipt;
            try {
                const webhook = await new this.databaseService.WebhooksModel({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                    body: details,
                    gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
                }).save();
            }
            catch (e) {
                await new this.databaseService.WebhooksModel({
                    body: details,
                    gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
                }).save();
            }
            const collectIdObject = new mongoose_1.Types.ObjectId(collect_id);
            const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
            if (!collectReq)
                throw new Error('Collect request not found');
            const isSeamless = collectReq.razorpay_seamless.razorpay_id;
            if (isSeamless) {
                return 'this is seamless transaction';
            }
            const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            if (!collectRequestStatus) {
                throw new Error('Collect Request Not Found');
            }
            const transaction_amount = amount / 100 || null;
            let payment_method = method || null;
            if (payment_method === 'netbanking') {
                payment_method = 'net_banking';
            }
            let detail;
            switch (payment_method) {
                case 'upi':
                    detail = {
                        upi: {
                            channel: null,
                            upi_id: payload.payment.entity.vpa || null,
                        },
                    };
                    break;
                case 'card':
                    detail = {
                        card: {
                            card_bank_name: card.type || null,
                            card_country: card.international === false
                                ? 'IN'
                                : card.international === true
                                    ? 'OI'
                                    : null,
                            card_network: card.network || null,
                            card_number: card_id || null,
                            card_sub_type: card.sub_type || null,
                            card_type: card.type || null,
                            channel: null,
                        },
                    };
                    break;
                case 'netbanking':
                    detail = {
                        netbanking: {
                            channel: null,
                            netbanking_bank_code: acquirer_data.bank_transaction_id,
                            netbanking_bank_name: bank,
                        },
                    };
                    break;
                case 'wallet':
                    detail = {
                        wallet: {
                            channel: wallet,
                            provider: wallet,
                        },
                    };
                    break;
                default:
                    detail = {};
            }
            const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            if (pendingCollectReq &&
                pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
                res.status(200).send('OK');
                return;
            }
            if (status.toLowerCase() == 'captured') {
                status = 'SUCCESS';
            }
            const orderPaymentDetail = {
                bank: bank,
                transaction_id: acquirer_data.bank_transaction_id,
                method: method,
            };
            const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                collect_id: collectIdObject,
            }, {
                $set: {
                    status: status,
                    payment_time: new Date(created_at * 1000),
                    transaction_amount,
                    payment_method,
                    details: JSON.stringify(detail),
                    bank_reference: acquirer_data.bank_transaction_id,
                    reason: error_reason,
                    payment_message: error_reason,
                },
            }, {
                upsert: true,
                new: true,
            });
            const webhookUrl = collectReq?.req_webhook_urls;
            const transaction_time = new Date(payment_time * 1000).toISOString();
            const webHookDataInfo = {
                collect_id,
                amount,
                status,
                trustee_id: collectReq.trustee_id,
                school_id: collectReq.school_id,
                req_webhook_urls: collectReq?.req_webhook_urls,
                custom_order_id: collectReq?.custom_order_id || null,
                createdAt: collectRequestStatus?.createdAt,
                transaction_time: transaction_time || collectRequestStatus?.updatedAt,
                additional_data: collectReq?.additional_data || null,
                details: collectRequestStatus.details,
                transaction_amount: collectRequestStatus.transaction_amount,
                bank_reference: collectRequestStatus.bank_reference,
                payment_method: collectRequestStatus.payment_method,
                payment_details: collectRequestStatus.details,
                formattedDate: (() => {
                    const dateObj = new Date(transaction_time);
                    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                })(),
            };
            if (webhookUrl !== null) {
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
                if (collectReq?.trustee_id.toString() === '66505181ca3e97e19f142075') {
                    setTimeout(async () => {
                        try {
                            await this.edvironPgService.sendErpWebhook(webhookUrl, webHookDataInfo, webhook_key);
                        }
                        catch (e) {
                            console.log(`Error sending webhook to ${webhookUrl}:`, e.message);
                        }
                    }, 60000);
                }
                else {
                    try {
                        await this.edvironPgService.sendErpWebhook(webhookUrl, webHookDataInfo, webhook_key);
                    }
                    catch (e) {
                        console.log(`Error sending webhook to ${webhookUrl}:`, e.message);
                    }
                }
            }
            return res.status(200).send('OK');
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async webhookV2(body, res) {
        const details = JSON.stringify(body);
        const webhook = await new this.databaseService.WebhooksModel({
            body: details,
            gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
        }).save();
        const { payload } = body;
        const { order_id, amount, method, bank, acquirer_data, error_reason, card, card_id, wallet, } = payload.payment.entity;
        let { status } = payload.payment.entity;
        const { created_at } = payload.payment.entity;
        const { created_at: payment_time, receipt } = payload.order.entity;
        try {
            const collect_id = receipt;
            try {
                const webhook = await new this.databaseService.WebhooksModel({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                    body: details,
                    gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
                }).save();
            }
            catch (e) {
                await new this.databaseService.WebhooksModel({
                    body: details,
                    gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
                }).save();
            }
            const collectIdObject = new mongoose_1.Types.ObjectId(collect_id);
            const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
            if (!collectReq)
                throw new Error('Collect request not found');
            const isSeamless = collectReq.razorpay_seamless.razorpay_id;
            if (isSeamless) {
                return 'this is seamless transaction';
            }
            const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            if (!collectRequestStatus) {
                throw new Error('Collect Request Not Found');
            }
            const transaction_amount = amount / 100 || null;
            let payment_method = method || null;
            if (payment_method === 'netbanking') {
                payment_method = 'net_banking';
            }
            let detail;
            switch (payment_method) {
                case 'upi':
                    detail = {
                        upi: {
                            channel: null,
                            upi_id: payload.payment.entity.vpa || null,
                        },
                    };
                    break;
                case 'card':
                    detail = {
                        card: {
                            card_bank_name: card.type || null,
                            card_country: card.international === false
                                ? 'IN'
                                : card.international === true
                                    ? 'OI'
                                    : null,
                            card_network: card.network || null,
                            card_number: card_id || null,
                            card_sub_type: card.sub_type || null,
                            card_type: card.type || null,
                            channel: null,
                        },
                    };
                    break;
                case 'netbanking':
                    detail = {
                        netbanking: {
                            channel: null,
                            netbanking_bank_code: acquirer_data.bank_transaction_id,
                            netbanking_bank_name: bank,
                        },
                    };
                    break;
                case 'wallet':
                    detail = {
                        wallet: {
                            channel: wallet,
                            provider: wallet,
                        },
                    };
                    break;
                default:
                    detail = {};
            }
            const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            if (pendingCollectReq &&
                pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
                res.status(200).send('OK');
                return;
            }
            if (status.toLowerCase() == 'captured') {
                status = 'SUCCESS';
            }
            const orderPaymentDetail = {
                bank: bank,
                transaction_id: acquirer_data.bank_transaction_id,
                method: method,
            };
            const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                collect_id: collectIdObject,
            }, {
                $set: {
                    status: status,
                    payment_time: new Date(created_at * 1000),
                    transaction_amount,
                    payment_method,
                    details: JSON.stringify(detail),
                    bank_reference: acquirer_data.bank_transaction_id,
                    reason: error_reason,
                    payment_message: error_reason,
                },
            }, {
                upsert: true,
                new: true,
            });
            const webhookUrl = collectReq?.req_webhook_urls;
            const transaction_time = new Date(payment_time * 1000).toISOString();
            const webHookDataInfo = {
                collect_id,
                amount,
                status,
                trustee_id: collectReq.trustee_id,
                school_id: collectReq.school_id,
                req_webhook_urls: collectReq?.req_webhook_urls,
                custom_order_id: collectReq?.custom_order_id || null,
                createdAt: collectRequestStatus?.createdAt,
                transaction_time: transaction_time || collectRequestStatus?.updatedAt,
                additional_data: collectReq?.additional_data || null,
                details: collectRequestStatus.details,
                transaction_amount: collectRequestStatus.transaction_amount,
                bank_reference: collectRequestStatus.bank_reference,
                payment_method: collectRequestStatus.payment_method,
                payment_details: collectRequestStatus.details,
                formattedDate: (() => {
                    const dateObj = new Date(transaction_time);
                    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                })(),
            };
            if (webhookUrl !== null) {
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
                if (collectReq?.trustee_id.toString() === '66505181ca3e97e19f142075') {
                    setTimeout(async () => {
                        try {
                            await this.edvironPgService.sendErpWebhook(webhookUrl, webHookDataInfo, webhook_key);
                        }
                        catch (e) {
                            console.log(`Error sending webhook to ${webhookUrl}:`, e.message);
                        }
                    }, 60000);
                }
                else {
                    try {
                        await this.edvironPgService.sendErpWebhook(webhookUrl, webHookDataInfo, webhook_key);
                    }
                    catch (e) {
                        console.log(`Error sending webhook to ${webhookUrl}:`, e.message);
                    }
                }
            }
            return res.status(200).send('OK');
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async refund(body) {
        console.log('hit');
        const { collect_id, refundAmount, refund_id } = body;
        return await this.razorpayServiceModel.refund(collect_id, refundAmount, refund_id);
    }
    async razorpayOrders(razorpay_id, razorpay_secret, count = '100', skip = '0', school_id, trustee_id, razorpay_mid, from, to) {
        try {
            if (!razorpay_id ||
                !razorpay_secret ||
                !school_id ||
                !trustee_id ||
                !from ||
                to ||
                !razorpay_mid) {
                throw new common_1.BadRequestException('All details are required');
            }
            const params = {
                count: parseInt(count, 10),
                skip: parseInt(skip, 10),
            };
            const getUTCUnix = (dateStr, isEnd = false) => {
                if (!dateStr)
                    return;
                const date = new Date(dateStr);
                if (isEnd)
                    date.setUTCHours(23, 59, 59, 999);
                else
                    date.setUTCHours(0, 0, 0, 0);
                return Math.floor(date.getTime() / 1000);
            };
            if (from)
                params.from = getUTCUnix(from);
            if (to)
                params.to = getUTCUnix(to, true);
            const result = await this.razorpayServiceModel.fetchAndStoreAll(razorpay_id, razorpay_secret, school_id, trustee_id, params, razorpay_mid);
            return {
                message: `Total orders fetched: ${result.length} and payment Detail from ${from} to ${to} Updated`,
            };
        }
        catch (err) {
            console.error('[API ERROR]', err);
            throw new common_1.InternalServerErrorException(`Razorpay API error: ${err.response?.data?.error?.description || err.message}`);
        }
    }
    async getSettlementsTransactions(body, req) {
        const { utr, razorpay_id, razropay_secret, token } = req.query;
        try {
            const limit = body.limit || 10;
            const skip = body.skip || 0;
            return await this.razorpayServiceModel.getTransactionForSettlements(utr, razorpay_id, razropay_secret, token, body.cursor, body.fromDate, limit, skip);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async initRefund(body) {
        try {
            return await this.razorpayServiceModel.refund(body.collect_id, body.refundAmount, body.refund_id);
        }
        catch (e) {
            console.log();
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.RazorpayNonseamlessController = RazorpayNonseamlessController;
__decorate([
    (0, common_1.Get)('/redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "razorpayRedirect", null);
__decorate([
    (0, common_1.Get)('/redirect/v2'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "razorpayRedirectV2", null);
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "webhook", null);
__decorate([
    (0, common_1.Post)('/webhook/v2'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "webhookV2", null);
__decorate([
    (0, common_1.Post)('test-refund-razorpay'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "refund", null);
__decorate([
    (0, common_1.Get)('orders-detail'),
    __param(0, (0, common_1.Query)('razorpay_id')),
    __param(1, (0, common_1.Query)('razorpay_secret')),
    __param(2, (0, common_1.Query)('count')),
    __param(3, (0, common_1.Query)('skip')),
    __param(4, (0, common_1.Query)('school_id')),
    __param(5, (0, common_1.Query)('trustee_id')),
    __param(6, (0, common_1.Query)('razorpay_mid')),
    __param(7, (0, common_1.Query)('from')),
    __param(8, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "razorpayOrders", null);
__decorate([
    (0, common_1.Post)('/settlements-transactions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "getSettlementsTransactions", null);
__decorate([
    (0, common_1.Post)('/init-refund'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RazorpayNonseamlessController.prototype, "initRefund", null);
exports.RazorpayNonseamlessController = RazorpayNonseamlessController = __decorate([
    (0, common_1.Controller)('razorpay-nonseamless'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        razorpay_nonseamless_service_1.RazorpayNonseamlessService,
        edviron_pg_service_1.EdvironPgService])
], RazorpayNonseamlessController);
//# sourceMappingURL=razorpay-nonseamless.controller.js.map