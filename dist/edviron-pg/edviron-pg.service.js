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
let EdvironPgService = class EdvironPgService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async collect(request, platform_charges, school_name) {
        try {
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
                    'x-partner-merchantid': request.clientId,
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
                const { data: easebuzzRes } = await axios.request(options);
                id = easebuzzRes.data;
                easebuzz_pg = true;
                console.log({ easebuzzRes, _id: request._id });
            }
            const { data: cashfreeRes } = await axios.request(config);
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
            return {
                url: process.env.URL +
                    '/edviron-pg/redirect?session_id=' +
                    cashfreeRes.payment_session_id +
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
        let transaction_time = "";
        if (order_status_to_transaction_status_map[cashfreeRes.order_status] === transactionStatus_1.TransactionStatus.SUCCESS) {
            transaction_time = collect_status?.updatedAt?.toString();
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
};
exports.EdvironPgService = EdvironPgService;
exports.EdvironPgService = EdvironPgService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EdvironPgService);
//# sourceMappingURL=edviron-pg.service.js.map