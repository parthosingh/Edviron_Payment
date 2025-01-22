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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdvironPgService = void 0;
const common_1 = require("@nestjs/common");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const database_service_1 = require("../database/database.service");
const transactionStatus_1 = require("../types/transactionStatus");
const sign_1 = require("../utils/sign");
const jwt = require("jsonwebtoken");
const axios_1 = require("axios");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const handlebars = require("handlebars");
const moment = require("moment-timezone");
const sign_2 = require("../utils/sign");
const cashfree_service_1 = require("../cashfree/cashfree.service");
let EdvironPgService = class EdvironPgService {
    constructor(databaseService, cashfreeService) {
        this.databaseService = databaseService;
        this.cashfreeService = cashfreeService;
    }
    async collect(request, platform_charges, school_name, splitPayments, vendor) {
        try {
            let paymentInfo = {
                cashfree_id: null,
                easebuzz_id: null,
                easebuzz_cc_id: null,
                easebuzz_dc_id: null,
                ccavenue_id: null,
                easebuzz_upi_id: null,
            };
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const schoolName = school_name.replace(/ /g, '-');
            const axios = require('axios');
            const currentTime = new Date();
            const expiryTime = new Date(currentTime.getTime() + 20 * 60000);
            const isoExpiryTime = expiryTime.toISOString();
            let data = JSON.stringify({
                customer_details: {
                    customer_id: '7112AAA812234',
                    customer_phone: '9898989898',
                },
                order_currency: 'INR',
                order_amount: request.amount.toFixed(2),
                order_id: request._id,
                order_meta: {
                    return_url: process.env.URL +
                        '/edviron-pg/callback?collect_request_id=' +
                        request._id,
                },
                order_expiry_time: isoExpiryTime,
            });
            console.log(splitPayments, 'split pay');
            if (splitPayments && vendor && vendor.length > 0) {
                const vendor_data = vendor
                    .filter(({ amount, percentage }) => {
                    return (amount && amount > 0) || (percentage && percentage > 0);
                })
                    .map(({ vendor_id, percentage, amount }) => ({
                    vendor_id,
                    percentage,
                    amount,
                }));
                data = JSON.stringify({
                    customer_details: {
                        customer_id: '7112AAA812234',
                        customer_phone: '9898989898',
                    },
                    order_currency: 'INR',
                    order_amount: request.amount.toFixed(2),
                    order_id: request._id,
                    order_meta: {
                        return_url: process.env.URL +
                            '/edviron-pg/callback?collect_request_id=' +
                            request._id,
                    },
                    order_splits: vendor_data,
                });
                console.log(data, 'checking for data');
                collectReq.isSplitPayments = true;
                collectReq.vendors_info = vendor;
                await collectReq.save();
                vendor.map(async (info) => {
                    const { vendor_id, percentage, amount, name } = info;
                    let split_amount = amount;
                    if (percentage) {
                        split_amount = (request.amount * percentage) / 100;
                    }
                    await new this.databaseService.VendorTransactionModel({
                        vendor_id: vendor_id,
                        amount: split_amount,
                        collect_id: request._id,
                        gateway: collect_request_schema_1.Gateway.EDVIRON_PG,
                        status: transactionStatus_1.TransactionStatus.PENDING,
                        trustee_id: request.trustee_id,
                        school_id: request.school_id,
                        custom_order_id: request.custom_order_id || '',
                        name,
                    }).save();
                });
            }
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.CASHFREE_ENDPOINT}/pg/orders`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': request.clientId || null,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
                data: data,
            };
            let id = '';
            let easebuzz_pg = false;
            if (request.easebuzz_sub_merchant_id) {
                let productinfo = 'payment gateway customer';
                let firstname = 'customer';
                let email = 'noreply@edviron.com';
                let hashData = process.env.EASEBUZZ_KEY +
                    '|' +
                    request._id +
                    '|' +
                    parseFloat(request.amount.toFixed(2)) +
                    '|' +
                    productinfo +
                    '|' +
                    firstname +
                    '|' +
                    email +
                    '|||||||||||' +
                    process.env.EASEBUZZ_SALT;
                const easebuzz_cb_surl = process.env.URL +
                    '/edviron-pg/easebuzz-callback?collect_request_id=' +
                    request._id +
                    '&status=pass';
                const easebuzz_cb_furl = process.env.URL +
                    '/edviron-pg/easebuzz-callback?collect_request_id=' +
                    request._id +
                    '&status=fail';
                let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
                let encodedParams = new URLSearchParams();
                encodedParams.set('key', process.env.EASEBUZZ_KEY);
                encodedParams.set('txnid', request._id.toString());
                encodedParams.set('amount', parseFloat(request.amount.toFixed(2)).toString());
                encodedParams.set('productinfo', productinfo);
                encodedParams.set('firstname', firstname);
                encodedParams.set('phone', '9898989898');
                encodedParams.set('email', email);
                encodedParams.set('surl', easebuzz_cb_surl);
                encodedParams.set('furl', easebuzz_cb_furl);
                encodedParams.set('hash', hash);
                encodedParams.set('request_flow', 'SEAMLESS');
                encodedParams.set('sub_merchant_id', request.easebuzz_sub_merchant_id);
                const options = {
                    method: 'POST',
                    url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                    data: encodedParams,
                };
                const { data: easebuzzRes } = await axios.request(options);
                id = easebuzzRes.data;
                paymentInfo.easebuzz_id = id || null;
                await this.getQr(request._id.toString(), request);
                easebuzz_pg = true;
            }
            let cf_payment_id = '';
            if (request.clientId) {
                const { data: cashfreeRes } = await axios.request(config);
                cf_payment_id = cashfreeRes.payment_session_id;
                paymentInfo.cashfree_id = cf_payment_id || null;
            }
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
            collectReq.paymentIds = paymentInfo;
            await collectReq.save();
            return {
                url: process.env.URL +
                    '/edviron-pg/redirect?session_id=' +
                    cf_payment_id +
                    '&collect_request_id=' +
                    request._id +
                    '&amount=' +
                    request.amount.toFixed(2) +
                    '&' +
                    disabled_modes_string +
                    '&platform_charges=' +
                    encodedPlatformCharges +
                    '&school_name=' +
                    schoolName +
                    '&easebuzz_pg=' +
                    easebuzz_pg +
                    '&payment_id=' +
                    id,
            };
        }
        catch (err) {
            console.log(err);
            if (err.name === 'AxiosError')
                throw new common_1.BadRequestException('Invalid client id or client secret ' +
                    JSON.stringify(err.response.data));
            console.log(err);
        }
    }
    async checkStatus(collect_request_id, collect_request) {
        const axios = require('axios');
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/` + collect_request_id,
            headers: {
                accept: 'application/json',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': collect_request.clientId,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
        };
        try {
            const { data: cashfreeRes } = await axios.request(config);
            const order_status_to_transaction_status_map = {
                ACTIVE: transactionStatus_1.TransactionStatus.FAILURE,
                PAID: transactionStatus_1.TransactionStatus.SUCCESS,
                EXPIRED: transactionStatus_1.TransactionStatus.FAILURE,
                TERMINATED: transactionStatus_1.TransactionStatus.FAILURE,
                TERMINATION_REQUESTED: transactionStatus_1.TransactionStatus.FAILURE,
            };
            const collect_status = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collect_request_id,
            });
            if (!collect_status) {
                console.log('No status found for custom order id', collect_request_id);
                throw new common_1.NotFoundException('No status found for custom order id');
            }
            let transaction_time = '';
            if (order_status_to_transaction_status_map[cashfreeRes.order_status] === transactionStatus_1.TransactionStatus.SUCCESS) {
                transaction_time = collect_status?.updatedAt?.toISOString();
            }
            const checkStatus = order_status_to_transaction_status_map[cashfreeRes.order_status];
            let status_code;
            if (checkStatus === transactionStatus_1.TransactionStatus.SUCCESS) {
                status_code = 200;
            }
            else {
                status_code = 400;
            }
            const date = new Date(transaction_time);
            const uptDate = moment(date);
            const istDate = uptDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
            const settlementInfo = await this.cashfreeService.settlementStatus(collect_request._id.toString(), collect_request.clientId);
            console.log(settlementInfo, 'opopo');
            return {
                status: order_status_to_transaction_status_map[cashfreeRes.order_status],
                amount: cashfreeRes.order_amount,
                transaction_amount: Number(collect_status?.transaction_amount),
                status_code,
                details: {
                    payment_mode: collect_status.payment_method,
                    bank_ref: collect_status?.bank_reference && collect_status?.bank_reference,
                    payment_methods: collect_status?.details &&
                        JSON.parse(collect_status.details),
                    transaction_time,
                    formattedTransactionDate: istDate,
                    order_status: cashfreeRes.order_status,
                    isSettlementComplete: settlementInfo.isSettlementComplete,
                    transfer_utr: settlementInfo.transfer_utr,
                    service_charge: settlementInfo.service_charge,
                },
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async terminateOrder(collect_id) {
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new Error('Collect Request not found');
        }
        const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: request._id,
        });
        if (!requestStatus) {
            throw new Error('Collect Request Status not found');
        }
        console.log('Terminating Order');
        if (request.gateway !== collect_request_schema_1.Gateway.PENDING) {
            console.log(request.gateway, 'not Terminating');
            return true;
        }
        request.gateway = collect_request_schema_1.Gateway.EXPIRED;
        requestStatus.status = transactionStatus_1.TransactionStatus.USER_DROPPED;
        await requestStatus.save();
        await request.save();
        console.log(`Order terminated: ${request.gateway}`);
        return true;
    }
    async easebuzzCheckStatus(collect_request_id, collect_request) {
        const amount = parseFloat(collect_request.amount.toString()).toFixed(1);
        const axios = require('axios');
        let hashData = process.env.EASEBUZZ_KEY +
            '|' +
            collect_request_id +
            '|' +
            amount.toString() +
            '|' +
            'noreply@edviron.com' +
            '|' +
            '9898989898' +
            '|' +
            process.env.EASEBUZZ_SALT;
        let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
        const qs = require('qs');
        const data = qs.stringify({
            txnid: collect_request_id,
            key: process.env.EASEBUZZ_KEY,
            amount: amount,
            email: 'noreply@edviron.com',
            phone: '9898989898',
            hash: hash,
        });
        const config = {
            method: 'POST',
            url: `https://dashboard.easebuzz.in/transaction/v1/retrieve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: data,
        };
        const { data: statusRes } = await axios.request(config);
        console.log(statusRes);
        return statusRes;
    }
    async getPaymentDetails(school_id, startDate, mode) {
        try {
            console.log({ school_id, startDate, mode });
            console.log(mode.toUpperCase());
            const data = await this.databaseService.CollectRequestStatusModel.aggregate([
                {
                    $match: {
                        status: { $in: ['success', 'SUCCESS'] },
                        createdAt: { $gte: new Date(startDate) },
                        payment_method: {
                            $in: [mode.toLocaleLowerCase(), mode.toUpperCase()],
                        },
                    },
                },
                {
                    $lookup: {
                        from: 'collectrequests',
                        localField: 'collect_id',
                        foreignField: '_id',
                        as: 'collect_request_data',
                    },
                },
                {
                    $unwind: '$collect_request_data',
                },
                {
                    $match: {
                        'collect_request_data.gateway': {
                            $in: ['EDVIRON_PG', 'EDVIRON_EASEBUZZ'],
                        },
                        'collect_request_data.school_id': school_id,
                    },
                },
                {
                    $project: {
                        _id: 0,
                        gateway: '$collect_request_data.gateway',
                        transaction_amount: 1,
                        payment_method: 1,
                    },
                },
            ]);
            return data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException('Error fetching payment details');
        }
    }
    async getQr(collect_id, request) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const upi_collect_id = `upi_${collect_id}`;
            let productinfo = 'payment gateway customer';
            let firstname = 'customer';
            let email = 'noreply@edviron.com';
            let hashData = process.env.EASEBUZZ_KEY +
                '|' +
                upi_collect_id +
                '|' +
                parseFloat(request.amount.toFixed(2)) +
                '|' +
                productinfo +
                '|' +
                firstname +
                '|' +
                email +
                '|||||||||||' +
                process.env.EASEBUZZ_SALT;
            const easebuzz_cb_surl = process.env.URL +
                '/edviron-pg/easebuzz-callback?collect_request_id=' +
                upi_collect_id +
                '&status=pass';
            const easebuzz_cb_furl = process.env.URL +
                '/edviron-pg/easebuzz-callback?collect_request_id=' +
                upi_collect_id +
                '&status=fail';
            let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
            let encodedParams = new URLSearchParams();
            encodedParams.set('key', process.env.EASEBUZZ_KEY);
            encodedParams.set('txnid', upi_collect_id);
            encodedParams.set('amount', parseFloat(request.amount.toFixed(2)).toString());
            console.log(request.easebuzz_sub_merchant_id, 'sub merchant');
            encodedParams.set('productinfo', productinfo);
            encodedParams.set('firstname', firstname);
            encodedParams.set('phone', '9898989898');
            encodedParams.set('email', email);
            encodedParams.set('surl', easebuzz_cb_surl);
            encodedParams.set('furl', easebuzz_cb_furl);
            encodedParams.set('hash', hash);
            encodedParams.set('request_flow', 'SEAMLESS');
            encodedParams.set('sub_merchant_id', request.easebuzz_sub_merchant_id);
            const options = {
                method: 'POST',
                url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: encodedParams,
            };
            const { data: easebuzzRes } = await axios_1.default.request(options);
            const access_key = easebuzzRes.data;
            console.log(access_key, 'access key');
            console.log(collectReq.paymentIds);
            let formData = new FormData();
            formData.append('access_key', access_key);
            formData.append('payment_mode', `UPI`);
            formData.append('upi_qr', 'true');
            formData.append('request_mode', 'SUVA');
            let config = {
                method: 'POST',
                url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/initiate_seamless_payment/`,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                data: formData,
            };
            const response = await axios_1.default.request(config);
            console.log(response.data, 'res in qr code');
            await this.databaseService.CollectRequestModel.findByIdAndUpdate(collect_id, {
                deepLink: response.data.qr_link,
            });
        }
        catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }
    async getSchoolInfo(school_id) {
        const payload = { school_id };
        const token = jwt.sign(payload, process.env.PAYMENTS_SERVICE_SECRET, {
            noTimestamp: true,
        });
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-school-data?token=${token}`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
            },
        };
        try {
            const { data: info } = await axios_1.default.request(config);
            console.log(info);
            return info;
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async sendTransactionmail(email, request) {
        const collectReqStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: request._id,
        });
        if (!collectReqStatus) {
            throw new Error('Collect request status not found');
        }
        const __dirname = path.resolve();
        const filePath = path.join(__dirname, 'src/template/transactionTemplate.html');
        const source = fs.readFileSync(filePath, 'utf-8').toString();
        const template = handlebars.compile(source);
        const student_data = JSON.parse(request.additional_data);
        console.log(student_data);
        const { student_name, student_email, student_phone_no } = student_data.student_details;
        const replacements = {
            transactionId: request._id.toString(),
            transactionAmount: collectReqStatus.transaction_amount,
            transactionDate: collectReqStatus.updatedAt?.toString(),
            studentName: student_name || ' NA',
            studentEmailId: student_email || 'NA',
            studentPhoneNo: student_phone_no || 'NA',
        };
        const htmlToSend = template(replacements);
        const transporter = nodemailer.createTransport({
            pool: true,
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.OAUTH_CLIENT_ID,
                clientSecret: process.env.OAUTH_CLIENT_SECRET,
                refreshToken: process.env.OAUTH_REFRESH_TOKEN,
            },
        });
        const mailOptions = {
            from: 'noreply@edviron.com',
            to: email,
            subject: `Edviron - Transaction success |order ID: ${replacements.transactionId}, order amount: INR ${replacements.transactionAmount}`,
            html: htmlToSend,
        };
        const info = await transporter.sendMail(mailOptions);
        return 'mail sent successfully';
    }
    async sendErpWebhook(webHookUrl, webhookData) {
        if (webHookUrl !== null) {
            const amount = webhookData.amount;
            const webHookData = await (0, sign_2.sign)({
                collect_id: webhookData.collect_id,
                amount,
                status: webhookData.status,
                trustee_id: webhookData.trustee_id,
                school_id: webhookData.school_id,
                req_webhook_urls: webhookData?.req_webhook_urls,
                custom_order_id: webhookData.custom_order_id,
                createdAt: webhookData.createdAt,
                transaction_time: webhookData?.updatedAt,
                additional_data: webhookData.additional_data,
                formattedTransactionDate: webhookData?.formattedDate,
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
                    const sendWebhook = async (url) => {
                        try {
                            const res = await axios_1.default.request(createConfig(url));
                            const currentIST = new Date().toLocaleString('en-US', {
                                timeZone: 'Asia/Kolkata',
                            });
                            console.log('saving webhook logs to Database');
                            console.log(res.status, 'response');
                            console.log(res.data);
                            const resDataString = typeof res.data === 'string'
                                ? res.data
                                : JSON.stringify(res.data) || 'undefined';
                            try {
                                await this.databaseService.ErpWebhooksLogsModel.create({
                                    collect_id: webHookData.collect_id,
                                    webhooktype: 'Transaction Webhook',
                                    payload: JSON.stringify(webhookData),
                                    webhook_url: url,
                                    school_id: webHookData.school_id,
                                    trustee_id: webHookData.trustee_id,
                                    isSuccess: true,
                                    response: resDataString,
                                    status_code: res.status.toString() || 'undefined',
                                    triggered_time: currentIST,
                                });
                            }
                            catch (e) {
                                console.log('Error in saving webhook');
                            }
                        }
                        catch (e) {
                            if (e.response?.data) {
                                const currentIST = new Date().toLocaleString('en-US', {
                                    timeZone: 'Asia/Kolkata',
                                });
                                await this.databaseService.ErpWebhooksLogsModel.create({
                                    collect_id: webHookData.collect_id,
                                    webhooktype: 'Transaction Webhook',
                                    payload: JSON.stringify(webhookData),
                                    webhook_url: url,
                                    school_id: webHookData.school_id,
                                    trustee_id: webHookData.trustee_id,
                                    isSuccess: false,
                                    response: JSON.stringify(e.response.data) || 'undefined',
                                    status_code: e.response.status || 'undefined',
                                    triggered_time: currentIST,
                                });
                            }
                        }
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
    }
    async test() {
        const data = {
            customer_details: {
                customer_email: null,
                customer_id: '7112AAA812234',
                customer_name: null,
                customer_phone: '9898989898',
            },
            order: {
                order_amount: 1,
                order_currency: 'INR',
                order_id: '670cf66fc95a5c255c5b0fc9',
                order_tags: null,
            },
            payment: {
                auth_id: null,
                bank_reference: '437848809219',
                cf_payment_id: 3140236156,
                payment_amount: 6.9,
                payment_currency: 'INR',
                payment_group: 'upi',
                payment_message: '00::APPROVED OR COMPLETED SUCCESSFULLY',
                payment_method: { upi: { channel: null, upi_id: '9074296363@ybl' } },
                payment_status: 'SUCCESS',
                payment_time: '2024-10-14T16:17:28+05:30',
            },
            payment_gateway_details: {
                gateway_name: 'CASHFREE',
                gateway_order_id: '3392076382',
                gateway_order_reference_id: 'null',
                gateway_payment_id: '3140236156',
                gateway_settlement: 'CASHFREE',
                gateway_status_code: null,
            },
            payment_offers: null,
        };
        const data2 = {
            customer_details: {
                customer_email: null,
                customer_id: '7112AAA812234',
                customer_name: null,
                customer_phone: '9898989898',
            },
            order: {
                order_amount: 1,
                order_currency: 'INR',
                order_id: '670b788613f8cf9da453fe56',
                order_tags: null,
            },
            payment: {
                auth_id: null,
                bank_reference: '138772344109',
                cf_payment_id: 3136782300,
                payment_amount: 1.02,
                payment_currency: 'INR',
                payment_group: 'upi',
                payment_message: '00::APPROVED OR COMPLETED SUCCESSFULLY',
                payment_method: { upi: { channel: null, upi_id: '9074296363@axl' } },
                payment_status: 'SUCCESS',
                payment_time: '2024-10-13T13:07:16+05:30',
            },
            payment_gateway_details: {
                gateway_name: 'CASHFREE',
                gateway_order_id: null,
                gateway_order_reference_id: null,
                gateway_payment_id: null,
                gateway_settlement: 'CASHFREE',
                gateway_status_code: null,
            },
            payment_offers: null,
        };
    }
    async createVendor(client_id, vendor_info) {
        const axios = require('axios');
        let data = JSON.stringify(vendor_info);
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/easy-split/vendors`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': client_id,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
            data: data,
        };
        console.log(config, 'config');
        try {
            const { data: Response } = await axios.request(config);
            console.log(Response, 'Res');
            return Response;
        }
        catch (e) {
            if (e?.response?.data) {
                throw new common_1.BadRequestException(e.response.data.message);
            }
            throw new common_1.BadRequestException(e.message);
        }
    }
    async convertISTStartToUTC(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const istStartDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        const utcStartTime = new Date(istStartDate.getTime() - 5 * 60 * 60 * 1000 - 30 * 60 * 1000);
        console.log('Converted date to UTC:', utcStartTime.toISOString());
        return utcStartTime.toISOString();
    }
    async convertISTEndToUTC(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const istEndDate = new Date(Date.UTC(year, month - 1, day, 18, 30, 9, 979));
        console.log('Converted end date to UTC:', istEndDate.toISOString());
        return istEndDate.toISOString();
    }
    async getVendorTransactions(query, limit, page) {
        const totalCount = await this.databaseService.VendorTransactionModel.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const vendorsTransaction = await this.databaseService.VendorTransactionModel.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);
        return {
            vendorsTransaction: vendorsTransaction,
            totalCount,
            page,
            limit,
            totalPages,
        };
    }
    async getTransactionReportBatched(trustee_id, start_date, end_date, status, school_id) {
        try {
            console.log(start_date, end_date);
            const endOfDay = new Date(end_date);
            const startDates = new Date(start_date);
            const startOfDayUTC = new Date(await this.convertISTStartToUTC(start_date));
            const endOfDayUTC = new Date(await this.convertISTEndToUTC(end_date));
            endOfDay.setHours(23, 59, 59, 999);
            let collectQuery = {
                trustee_id: trustee_id,
                createdAt: {
                    $gte: new Date(startDates.getTime() - 24 * 60 * 60 * 1000),
                    $lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000),
                },
            };
            if (school_id) {
                collectQuery = {
                    ...collectQuery,
                    school_id: school_id,
                };
            }
            const orders = await this.databaseService.CollectRequestModel.find(collectQuery).select('_id');
            let transactions = [];
            const orderIds = orders.map((order) => order._id);
            let query = {
                collect_id: { $in: orderIds },
            };
            const startDate = new Date(start_date);
            const endDate = end_date;
            console.log(new Date(endDate), 'End date before adding hr');
            console.log(endOfDay, 'end date after adding hr');
            if (startDate && endDate) {
                query = {
                    ...query,
                    updatedAt: {
                        $gte: startOfDayUTC,
                        $lt: endOfDayUTC,
                    },
                };
            }
            if ((status && status === 'SUCCESS') || status === 'PENDING') {
                console.log('adding status to transaction');
                query = {
                    ...query,
                    status: { $in: [status.toUpperCase(), status.toLowerCase()] },
                };
            }
            if (school_id) {
            }
            transactions =
                await this.databaseService.CollectRequestStatusModel.aggregate([
                    {
                        $match: query,
                    },
                    {
                        $project: {
                            collect_id: 1,
                            transaction_amount: 1,
                            order_amount: 1,
                            status: 1,
                            createdAt: 1,
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
                        $group: {
                            _id: '$collect_request.trustee_id',
                            totalTransactionAmount: { $sum: '$transaction_amount' },
                            totalOrderAmount: { $sum: '$order_amount' },
                            totalTransactions: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            totalTransactionAmount: 1,
                            totalOrderAmount: 1,
                            totalTransactions: 1,
                        },
                    },
                ]);
            console.timeEnd('transactionsCount');
            return {
                length: transactions.length,
                transactions,
            };
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getTransactionReportBatchedFilterd(trustee_id, start_date, end_date, status, school_id, mode, isQRPayment) {
        try {
            const endOfDay = new Date(end_date);
            const startDates = new Date(start_date);
            const startOfDayUTC = new Date(await this.convertISTStartToUTC(start_date));
            const endOfDayUTC = new Date(await this.convertISTEndToUTC(end_date));
            endOfDay.setHours(23, 59, 59, 999);
            let collectQuery = {
                trustee_id: trustee_id,
                createdAt: {
                    $gte: new Date(startDates.getTime() - 24 * 60 * 60 * 1000),
                    $lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000),
                },
            };
            if (school_id) {
                collectQuery = {
                    ...collectQuery,
                    school_id: school_id,
                };
            }
            if (isQRPayment) {
                collectQuery = {
                    ...collectQuery,
                    isQRPayment: true,
                };
            }
            const orders = await this.databaseService.CollectRequestModel.find(collectQuery).select('_id');
            let transactions = [];
            const orderIds = orders.map((order) => order._id);
            let query = {
                collect_id: { $in: orderIds },
            };
            const startDate = new Date(start_date);
            const endDate = end_date;
            console.log(new Date(endDate), 'End date before adding hr');
            console.log(endOfDay, 'end date after adding hr');
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
            if ((status && status === 'SUCCESS') || status === 'PENDING') {
                console.log('adding status to transaction');
                query = {
                    ...query,
                    status: { $in: [status.toUpperCase(), status.toLowerCase()] },
                };
            }
            if (school_id) {
            }
            if (mode) {
                query = {
                    ...query,
                    payment_method: { $in: mode },
                };
            }
            console.log(query, 'qqq');
            transactions =
                await this.databaseService.CollectRequestStatusModel.aggregate([
                    {
                        $match: query,
                    },
                    {
                        $project: {
                            collect_id: 1,
                            transaction_amount: 1,
                            order_amount: 1,
                            status: 1,
                            createdAt: 1,
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
                        $group: {
                            _id: '$collect_request.trustee_id',
                            totalTransactionAmount: { $sum: '$transaction_amount' },
                            totalOrderAmount: { $sum: '$order_amount' },
                            totalTransactions: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            totalTransactionAmount: 1,
                            totalOrderAmount: 1,
                            totalTransactions: 1,
                        },
                    },
                ]);
            console.timeEnd('transactionsCount');
            console.log(transactions, 'sum of aggreagations');
            return {
                length: transactions.length,
                transactions,
            };
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async generateBacthTransactions(trustee_id, start_date, end_date, status) {
        try {
            const monthsFull = [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
            ];
            const orders = await this.databaseService.CollectRequestModel.find({
                trustee_id: trustee_id,
            }).select('_id');
            let transactions = [];
            const orderIds = orders.map((order) => order._id);
            let query = {
                collect_id: { $in: orderIds },
            };
            const startDate = new Date(start_date);
            const endDate = end_date;
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            console.log(end_date);
            console.log(new Date(endDate), 'End date before adding hr');
            console.log(endOfDay, 'end date after adding hr');
            if (startDate && endDate) {
                query = {
                    ...query,
                    createdAt: {
                        $gte: startDate,
                        $lt: endOfDay,
                    },
                };
            }
            console.log(`getting transaction`);
            if ((status && status === 'SUCCESS') || status === 'PENDING') {
                console.log('adding status to transaction');
                query = {
                    ...query,
                    status: { $regex: new RegExp(`^${status}$`, 'i') },
                };
            }
            const checkbatch = await this.databaseService.BatchTransactionModel.findOne({
                trustee_id: trustee_id,
                month: monthsFull[new Date(endDate).getMonth()],
                year: new Date(endDate).getFullYear().toString(),
            });
            if (checkbatch) {
                await this.databaseService.ErrorLogsModel.create({
                    type: 'BATCH TRANSACTION CORN',
                    des: `Batch transaction already exists for trustee_id ${transactions[0].trustee_id}`,
                    identifier: trustee_id,
                    body: `${JSON.stringify({ startDate, endDate, status })}`,
                });
                throw new Error(`Batch transaction`);
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
                        $group: {
                            _id: '$collect_request.trustee_id',
                            totalTransactionAmount: { $sum: '$transaction_amount' },
                            totalOrderAmount: { $sum: '$order_amount' },
                            totalTransactions: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            trustee_id: '$_id',
                            totalTransactionAmount: 1,
                            totalOrderAmount: 1,
                            totalTransactions: 1,
                        },
                    },
                ]);
            if (transactions.length > 0) {
                await new this.databaseService.BatchTransactionModel({
                    trustee_id: transactions[0].trustee_id,
                    total_order_amount: transactions[0].totalOrderAmount,
                    total_transaction_amount: transactions[0].totalTransactionAmount,
                    total_transactions: transactions[0].totalTransactions,
                    month: monthsFull[new Date(endDate).getMonth()],
                    year: new Date(endDate).getFullYear().toString(),
                    status,
                }).save();
            }
            return {
                transactions,
                totalTransactions: transactionsCount,
                month: monthsFull[new Date(endDate).getMonth()],
                year: new Date(endDate).getFullYear().toString(),
            };
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getBatchTransactions(trustee_id, year) {
        try {
            const batch = await this.databaseService.BatchTransactionModel.find({
                trustee_id,
                year,
            });
            if (!batch) {
                throw new Error('Batch not found');
            }
            return batch;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.EdvironPgService = EdvironPgService;
exports.EdvironPgService = EdvironPgService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        cashfree_service_1.CashfreeService])
], EdvironPgService);
const data = {
    customer_details: {
        customer_email: null,
        customer_id: '7112AAA812234',
        customer_name: null,
        customer_phone: '9898989898',
    },
    order: {
        order_amount: 8700,
        order_currency: 'INR',
        order_id: '678ccb5b12a7c6cd1b64e320',
        order_tags: null,
    },
    payment: {
        auth_id: null,
        bank_reference: null,
        cf_payment_id: 3425695002,
        payment_amount: 8900.19,
        payment_currency: 'INR',
        payment_group: 'upi',
        payment_message: 'User dropped and did not complete the two factor authentication',
        payment_method: { upi: { channel: null, upi_id: null } },
        payment_status: 'USER_DROPPED',
        payment_time: '2025-01-19T15:22:31+05:30',
    },
    payment_gateway_details: {
        gateway_name: 'CASHFREE',
        gateway_order_id: '3694981450',
        gateway_order_reference_id: 'null',
        gateway_payment_id: '3425695002',
        gateway_settlement: null,
        gateway_status_code: null,
    },
    payment_offers: null,
};
const de = {
    customer_details: {
        customer_email: null,
        customer_id: '7112AAA812234',
        customer_name: null,
        customer_phone: '9898989898',
    },
    order: {
        order_amount: 8700,
        order_currency: 'INR',
        order_id: '678ccb5b12a7c6cd1b64e320',
        order_tags: null,
    },
    payment: {
        auth_id: null,
        bank_reference: null,
        cf_payment_id: 3425695419,
        payment_amount: 8900.19,
        payment_currency: 'INR',
        payment_group: 'upi',
        payment_message: 'User dropped and did not complete the two factor authentication',
        payment_method: { upi: { channel: null, upi_id: null } },
        payment_status: 'USER_DROPPED',
        payment_time: '2025-01-19T15:22:40+05:30',
    },
    payment_gateway_details: {
        gateway_name: 'CASHFREE',
        gateway_order_id: '3694981450',
        gateway_order_reference_id: 'null',
        gateway_payment_id: '3425695419',
        gateway_settlement: null,
        gateway_status_code: null,
    },
    payment_offers: null,
};
//# sourceMappingURL=edviron-pg.service.js.map