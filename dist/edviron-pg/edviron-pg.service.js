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
const database_service_1 = require("../database/database.service");
const transactionStatus_1 = require("../types/transactionStatus");
const sign_1 = require("../utils/sign");
const jwt = require("jsonwebtoken");
const axios_1 = require("axios");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const handlebars = require("handlebars");
const sign_2 = require("../utils/sign");
let EdvironPgService = class EdvironPgService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async collect(request, platform_charges, school_name) {
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
            });
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
                console.log({ easebuzzRes, _id: request._id });
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
            console.log(cashfreeRes, 'cashfree status response');
            const order_status_to_transaction_status_map = {
                ACTIVE: transactionStatus_1.TransactionStatus.PENDING,
                PAID: transactionStatus_1.TransactionStatus.SUCCESS,
                EXPIRED: transactionStatus_1.TransactionStatus.FAILURE,
                TERMINATED: transactionStatus_1.TransactionStatus.FAILURE,
                TERMINATION_REQUESTED: transactionStatus_1.TransactionStatus.FAILURE,
            };
            const collect_status = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collect_request_id,
            });
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
            return {
                status: order_status_to_transaction_status_map[cashfreeRes.order_status],
                amount: cashfreeRes.order_amount,
                status_code,
                details: {
                    bank_ref: collect_status?.bank_reference && collect_status?.bank_reference,
                    payment_methods: collect_status?.details &&
                        JSON.parse(collect_status.details),
                    transaction_time,
                    order_status: cashfreeRes.order_status,
                },
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
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
        const collectReqStatus = await this.databaseService.CollectRequestStatusModel.findOne({ collect_id: request._id });
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
            html: htmlToSend
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
                status,
                trustee_id: webhookData.trustee_id,
                school_id: webhookData.school_id,
                req_webhook_urls: webhookData?.req_webhook_urls,
                custom_order_id: webhookData.custom_order_id,
                createdAt: webhookData.createdAt,
                transaction_time: webhookData?.updatedAt,
                additional_data: webhookData.additional_data,
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
    }
};
exports.EdvironPgService = EdvironPgService;
exports.EdvironPgService = EdvironPgService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EdvironPgService);
//# sourceMappingURL=edviron-pg.service.js.map