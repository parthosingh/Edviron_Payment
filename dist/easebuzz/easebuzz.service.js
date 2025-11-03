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
exports.EasebuzzService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const sign_1 = require("../utils/sign");
const axios_1 = require("axios");
const transactionStatus_1 = require("../types/transactionStatus");
const crypto = require('crypto');
let EasebuzzService = class EasebuzzService {
    constructor(databaseService) {
        this.databaseService = databaseService;
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
        console.log({ statusRes });
        return statusRes;
    }
    async statusResponse(requestId, collectReq) {
        let statusResponse = await this.easebuzzCheckStatus(requestId, collectReq);
        if (statusResponse.msg.mode === 'NA') {
            console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
            statusResponse = await this.easebuzzCheckStatus(`upi_${requestId}`, collectReq);
        }
        return statusResponse;
    }
    async statusResponsev2(requestId, collectReq) {
        try {
            let statusResponse = await this.easebuzzWebhookCheckStatusV2(requestId, collectReq);
            console.log({ statusResponse });
            if (statusResponse.msg.mode === 'NA' || statusResponse.status === false) {
                console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
                statusResponse = await this.easebuzzWebhookCheckStatusV2(`upi_${requestId}`, collectReq);
            }
            console.log(statusResponse);
            return statusResponse;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async initiateRefund(collect_id, refund_amount, refund_id) {
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Collect Request not found');
        }
        const transaction = await this.statusResponse(collect_id, collectRequest);
        console.log(transaction.msg.easepayid);
        const order_id = transaction.msg.easepayid;
        if (!order_id) {
            throw new common_1.BadRequestException('Order ID not found');
        }
        const hashStringV2 = `${process.env.EASEBUZZ_KEY}|${refund_id}|${order_id}|${refund_amount.toFixed(1)}|${process.env.EASEBUZZ_SALT}`;
        let hash2 = await (0, sign_1.calculateSHA512Hash)(hashStringV2);
        const data2 = {
            key: process.env.EASEBUZZ_KEY,
            merchant_refund_id: refund_id,
            easebuzz_id: order_id,
            refund_amount: refund_amount.toFixed(1),
            hash: hash2,
        };
        const config = {
            method: 'POST',
            url: `https://dashboard.easebuzz.in/transaction/v2/refund`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: data2,
        };
        try {
            console.log('initiating refund with easebuzz');
            const response = await (0, axios_1.default)(config);
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async initiateRefundv2(collect_id, refund_amount, refund_id) {
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Collect Request not found');
        }
        const transaction = await this.statusResponse(collect_id, collectRequest);
        console.log(transaction.msg.easepayid);
        const order_id = transaction.msg.easepayid;
        if (!order_id) {
            throw new common_1.BadRequestException('Order ID not found');
        }
        const easebuzz_key = collectRequest.easebuzz_non_partner_cred.easebuzz_key;
        const easebuzz_salt = collectRequest.easebuzz_non_partner_cred.easebuzz_salt;
        const hashStringV2 = `${easebuzz_key}|${refund_id}|${order_id}|${refund_amount.toFixed(1)}|${easebuzz_salt}`;
        let hash2 = await (0, sign_1.calculateSHA512Hash)(hashStringV2);
        const data2 = {
            key: easebuzz_key,
            merchant_refund_id: refund_id,
            easebuzz_id: order_id,
            refund_amount: refund_amount.toFixed(1),
            hash: hash2,
        };
        const config = {
            method: 'POST',
            url: `https://dashboard.easebuzz.in/transaction/v2/refund`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: data2,
        };
        try {
            console.log('initiating refund with easebuzz');
            const response = await (0, axios_1.default)(config);
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async checkRefundSttaus(collect_id) {
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Collect Request not found');
        }
        const transaction = await this.statusResponse(collect_id, collectRequest);
        console.log(transaction.msg.easepayid);
        const order_id = transaction.msg.easepayid;
        if (!order_id) {
            throw new common_1.BadRequestException('Order ID not found');
        }
        if (collectRequest.easebuzz_non_partner) {
            const easebuzz_key = collectRequest.easebuzz_non_partner_cred.easebuzz_key;
            const easebuzz_salt = collectRequest.easebuzz_non_partner_cred.easebuzz_salt;
            const hashString = `${easebuzz_key}|${order_id}|${easebuzz_salt}`;
            let hash = await (0, sign_1.calculateSHA512Hash)(hashString);
            const data = {
                key: easebuzz_key,
                easebuzz_id: order_id,
                hash: hash,
            };
            const config = {
                method: 'POST',
                url: `https://dashboard.easebuzz.in/refund/v1/retrieve`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: data,
            };
            try {
                console.log('checking refund status with easebuzz');
                const response = await (0, axios_1.default)(config);
                console.log(response.data);
                return response.data;
            }
            catch (e) {
                console.log(e);
                throw new common_1.BadRequestException(e.message);
            }
        }
        const hashString = `${process.env.EASEBUZZ_KEY}|${order_id}|${process.env.EASEBUZZ_SALT}`;
        let hash = await (0, sign_1.calculateSHA512Hash)(hashString);
        const data = {
            key: process.env.EASEBUZZ_KEY,
            easebuzz_id: order_id,
            hash: hash,
        };
        const config = {
            method: 'POST',
            url: `https://dashboard.easebuzz.in/refund/v1/retrieve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: data,
        };
        try {
            console.log('checking refund status with easebuzz');
            const response = await (0, axios_1.default)(config);
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getQrBase64(collect_id) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.BadRequestException('Collect Request not found');
            }
            collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
            await collectRequest.save();
            const upiIntentUrl = collectRequest.deepLink;
            var QRCode = require('qrcode');
            const qrCodeBase64 = await QRCode.toDataURL(upiIntentUrl, {
                margin: 2,
                width: 300,
            });
            const qrBase64 = qrCodeBase64.split(',')[1];
            return {
                intentUrl: upiIntentUrl,
                qrCodeBase64: qrBase64,
                collect_id,
            };
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async updateDispute(case_id, action, reason, documents) {
        const hash = await (0, sign_1.calculateSHA512Hash)(process.env.EASEBUZZ_KEY);
        const config = {
            method: 'post',
            url: `https://drs.easebuzz.in/api/v1/merchant/case/update_status/`,
            headers: {
                key: process.env.EASEBUZZ_KEY,
                hash,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            data: {
                case_id: case_id,
                action: action,
                reason: reason,
                documents: documents,
            },
        };
        try {
            const { data } = await axios_1.default.request(config);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
    async createOrderV2(request, platform_charges, school_name) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const { additional_data } = collectReq;
            if (request.isSplitPayments) {
                if (!request.easebuzz_split_label) {
                    throw new common_1.BadRequestException(`Split Information Not Configure Please contact tarun.k@edviron.com`);
                }
                const studentDetail = JSON.parse(additional_data);
                const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
                const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
                const easebuzz_sub_merchant_id = request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
                let productinfo = 'payment gateway customer';
                let firstname = studentDetail.student_details?.student_name || 'customer';
                let email = studentDetail.student_details?.student_email || 'noreply@edviron.com';
                let student_id = studentDetail?.student_details?.student_id || 'NA';
                let student_phone_no = studentDetail?.student_details?.student_phone_no || '0000000000';
                const additionalData = studentDetail.additional_fields || {};
                let hashData = easebuzz_key +
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
                    '|' +
                    student_id +
                    '|' +
                    student_phone_no +
                    '|' +
                    '||||||||' +
                    easebuzz_salt;
                const easebuzz_cb_surl = process.env.URL +
                    '/easebuzz/easebuzz-callback?collect_request_id=' +
                    request._id +
                    '&status=pass';
                const easebuzz_cb_furl = process.env.URL +
                    '/easebuzz/easebuzz-callback?collect_request_id=' +
                    request._id +
                    '&status=fail';
                let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
                let encodedParams = new URLSearchParams();
                encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
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
                encodedParams.set('udf1', student_id);
                encodedParams.set('udf2', student_phone_no);
                let ezb_split_payments = {};
                if (request.isSplitPayments &&
                    request.easebuzzVendors &&
                    request.easebuzz_split_label &&
                    request.easebuzzVendors.length > 0) {
                    let vendorTotal = 0;
                    for (const vendor of request.easebuzzVendors) {
                        if (vendor.name && typeof vendor.amount === 'number') {
                            ezb_split_payments[vendor.vendor_id] = vendor.amount;
                            vendorTotal += vendor.amount;
                        }
                        await new this.databaseService.VendorTransactionModel({
                            vendor_id: vendor.vendor_id,
                            amount: vendor.amount,
                            collect_id: request._id,
                            gateway: collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ,
                            status: transactionStatus_1.TransactionStatus.PENDING,
                            trustee_id: request.trustee_id,
                            school_id: request.school_id,
                            custom_order_id: request.custom_order_id || '',
                            name: vendor.name,
                        }).save();
                    }
                    const remainingAmount = request.amount - vendorTotal;
                    if (remainingAmount > 0) {
                        ezb_split_payments[request.easebuzz_split_label] = remainingAmount;
                    }
                    encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
                }
                else {
                    ezb_split_payments[request.easebuzz_split_label] = request.amount;
                    encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
                }
                const Ezboptions = {
                    method: 'POST',
                    url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                    data: encodedParams,
                };
                const disabled_modes_string = request.disabled_modes
                    .map((mode) => `${mode}=false`)
                    .join('&');
                const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
                const { data: easebuzzRes } = await axios_1.default.request(Ezboptions);
                console.log({ easebuzzRes });
                const easebuzzPaymentId = easebuzzRes.data;
                collectReq.paymentIds.easebuzz_id = easebuzzPaymentId;
                await collectReq.save();
                await this.getQr(request._id.toString(), request, ezb_split_payments);
                return {
                    collect_request_id: request._id,
                    url: process.env.URL +
                        '/edviron-pg/redirect?' +
                        '&collect_request_id=' +
                        request._id +
                        '&amount=' +
                        request.amount.toFixed(2) +
                        '&' +
                        disabled_modes_string +
                        '&platform_charges=' +
                        encodedPlatformCharges +
                        '&school_name=' +
                        school_name +
                        '&easebuzz_pg=' +
                        true +
                        '&payment_id=' +
                        easebuzzPaymentId,
                };
            }
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async createOrderV2NonSplit(request, platform_charges, school_name, easebuzz_school_label, isMasterGateway) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const { additional_data } = collectReq;
            const studentDetail = JSON.parse(additional_data);
            const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
            const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
            const easebuzz_sub_merchant_id = request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
            let productinfo = 'payment gateway customer';
            let firstname = (studentDetail.student_details?.student_name || 'customer').trim();
            let email = studentDetail.student_details?.student_email || 'noreply@edviron.com';
            let student_id = studentDetail?.student_details?.student_id || 'NA';
            let student_phone_no = studentDetail?.student_details?.student_phone_no || '0000000000';
            const additionalData = studentDetail.additional_fields || {};
            const udfValues = [
                student_id,
                student_phone_no,
                ...Object.values(additionalData),
            ];
            const udfPadded = [
                ...udfValues,
                ...new Array(10 - udfValues.length).fill(''),
            ].slice(0, 10);
            const hashData2 = [
                easebuzz_key,
                request._id,
                parseFloat(request.amount.toFixed(2)),
                productinfo,
                firstname,
                email,
                ...udfPadded,
                easebuzz_salt,
            ].join('|');
            let hashData = easebuzz_key +
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
                '|' +
                student_id +
                '|' +
                student_phone_no +
                '|' +
                '||||||||' +
                easebuzz_salt;
            console.log({ hashData });
            const easebuzz_cb_surl = process.env.URL +
                '/easebuzz/easebuzz-callback/?collect_request_id=' +
                request._id +
                '&status=pass';
            const easebuzz_cb_furl = process.env.URL +
                '/easebuzz/easebuzz-callback/?collect_request_id=' +
                request._id +
                '&status=fail';
            let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
            let encodedParams = new URLSearchParams();
            encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
            encodedParams.set('txnid', request._id.toString());
            encodedParams.set('amount', parseFloat(request.amount.toFixed(2)).toString());
            encodedParams.set('productinfo', productinfo);
            encodedParams.set('firstname', firstname);
            encodedParams.set('phone', student_phone_no);
            encodedParams.set('email', email);
            encodedParams.set('surl', easebuzz_cb_surl);
            encodedParams.set('furl', easebuzz_cb_furl);
            encodedParams.set('hash', hash);
            encodedParams.set('request_flow', 'SEAMLESS');
            encodedParams.set('udf1', student_id);
            encodedParams.set('udf2', student_phone_no);
            let ezb_split_payments = {};
            if (request.easebuzz_split_label) {
                ezb_split_payments[request.easebuzz_split_label] = request.amount;
                encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
            }
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
            const Ezboptions = {
                method: 'POST',
                url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: encodedParams,
            };
            console.log(Ezboptions, 'Ezboptions');
            const { data: easebuzzRes } = await axios_1.default.request(Ezboptions);
            console.log(easebuzzRes, 'easebuzzRessss NON UPI');
            const easebuzzPaymentId = easebuzzRes.data;
            if (collectReq.paymentIds) {
                console.log('payment id ');
                collectReq.paymentIds.easebuzz_id = easebuzzPaymentId;
            }
            else {
                collectReq.paymentIds = { easebuzz_id: easebuzzPaymentId };
            }
            await collectReq.save();
            await this.getQrNonSplit(request._id.toString(), request);
            const schoolName = school_name.replace(/ /g, '_');
            return {
                collect_request_id: request._id,
                collect_request_url: process.env.URL +
                    '/edviron-pg/redirect?' +
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
                    true +
                    '&payment_id=' +
                    easebuzzPaymentId,
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getQr(collect_id, request, ezb_split_payments) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
            const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
            const upi_collect_id = `upi_${collect_id}`;
            let productinfo = 'payment gateway customer';
            let firstname = 'customer';
            let email = 'noreply@edviron.com';
            let hashData = easebuzz_key +
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
                easebuzz_salt;
            const easebuzz_cb_surl = process.env.URL +
                '/easebuzz/easebuzz-callback?collect_request_id=' +
                upi_collect_id +
                '&status=pass';
            const easebuzz_cb_furl = process.env.URL +
                '/easebuzz/easebuzz-callback?collect_request_id=' +
                upi_collect_id +
                '&status=fail';
            let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
            let encodedParams = new URLSearchParams();
            encodedParams.set('key', easebuzz_key);
            encodedParams.set('txnid', upi_collect_id);
            encodedParams.set('amount', parseFloat(request.amount.toFixed(2)).toString());
            encodedParams.set('productinfo', productinfo);
            encodedParams.set('firstname', firstname);
            encodedParams.set('phone', '9898989898');
            encodedParams.set('email', email);
            encodedParams.set('surl', easebuzz_cb_surl);
            encodedParams.set('furl', easebuzz_cb_furl);
            encodedParams.set('hash', hash);
            encodedParams.set('request_flow', 'SEAMLESS');
            encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
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
            console.log({ easebuzzRes });
            const access_key = easebuzzRes.data;
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
            await this.databaseService.CollectRequestModel.findByIdAndUpdate(collect_id, {
                deepLink: response.data.qr_link,
            });
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getQrNonSplit(collect_id, request) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
            const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
            const easebuzz_sub_merchant_id = request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
            const upi_collect_id = `upi_${collect_id}`;
            let productinfo = 'payment gateway customer';
            const { additional_data } = collectReq;
            const studentDetail = JSON.parse(additional_data);
            let firstname = (studentDetail.student_details?.student_name || 'customer').trim();
            let email = studentDetail.student_details?.student_email || 'noreply@edviron.com';
            let student_id = studentDetail?.student_details?.student_id || 'NA';
            let student_phone_no = studentDetail?.student_details?.student_phone_no || '0000000000';
            let hashData = easebuzz_key +
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
                '|' +
                student_id +
                '|' +
                student_phone_no +
                '|' +
                '||||||||' +
                easebuzz_salt;
            const easebuzz_cb_surl = process.env.URL +
                '/easebuzz/easebuzz-callback?collect_request_id=' +
                upi_collect_id +
                '&status=pass';
            const easebuzz_cb_furl = process.env.URL +
                '/easebuzz/easebuzz-callback?collect_request_id=' +
                upi_collect_id +
                '&status=fail';
            let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
            let encodedParams = new URLSearchParams();
            encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
            encodedParams.set('txnid', upi_collect_id);
            encodedParams.set('amount', parseFloat(request.amount.toFixed(2)).toString());
            encodedParams.set('productinfo', productinfo);
            encodedParams.set('firstname', firstname);
            encodedParams.set('phone', student_phone_no);
            encodedParams.set('email', email);
            encodedParams.set('surl', easebuzz_cb_surl);
            encodedParams.set('furl', easebuzz_cb_furl);
            encodedParams.set('hash', hash);
            encodedParams.set('request_flow', 'SEAMLESS');
            encodedParams.set('udf1', student_id);
            encodedParams.set('udf2', student_phone_no);
            const options = {
                method: 'POST',
                url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: encodedParams,
            };
            let ezb_split_payments = {};
            if (request.easebuzz_split_label) {
                ezb_split_payments[request.easebuzz_split_label] = request.amount;
                encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
            }
            const { data: easebuzzRes } = await axios_1.default.request(options);
            console.log(easebuzzRes, 'UPI');
            const access_key = easebuzzRes.data;
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
            await this.databaseService.CollectRequestModel.findByIdAndUpdate(collect_id, {
                deepLink: response.data.qr_link,
            });
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async easebuzzCheckStatusV2(collect_request_id, collect_request) {
        const easebuzz_key = collect_request.easebuzz_non_partner_cred.easebuzz_key;
        const easebuzz_salt = collect_request.easebuzz_non_partner_cred.easebuzz_salt;
        const easebuzz_sub_merchant_id = collect_request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
        const amount = parseFloat(collect_request.amount.toString()).toFixed(1);
        const axios = require('axios');
        let hashData = easebuzz_key +
            '|' +
            collect_request_id +
            '|' +
            amount.toString() +
            '|' +
            'noreply@edviron.com' +
            '|' +
            '9898989898' +
            '|' +
            easebuzz_salt;
        let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
        const qs = require('qs');
        const data = qs.stringify({
            txnid: collect_request_id,
            key: easebuzz_key,
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
    async statusResponseV2(requestId, collectReq) {
        try {
            let statusResponse = await this.easebuzzCheckStatus(requestId, collectReq);
            if (statusResponse.msg.mode === 'NA') {
                console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
                statusResponse = await this.easebuzzCheckStatus(`upi_${requestId}`, collectReq);
            }
            return statusResponse;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async easebuzzWebhookCheckStatusV2(collect_request_id, collect_request) {
        const amount = parseFloat(collect_request.amount.toString()).toFixed(1);
        const easebuzz_key = collect_request.easebuzz_non_partner_cred.easebuzz_key;
        const easebuzz_salt = collect_request.easebuzz_non_partner_cred.easebuzz_salt;
        const easebuzz_sub_merchant_id = collect_request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
        const axios = require('axios');
        const { additional_data } = collect_request;
        const studentDetail = JSON.parse(additional_data);
        let firstname = studentDetail.student_details?.student_name || 'customer';
        let email = studentDetail.student_details?.student_email || 'noreply@edviron.com';
        let student_id = studentDetail?.student_details?.student_id || 'NA';
        let student_phone_no = studentDetail?.student_details?.student_phone_no || '0000000000';
        let hashData = easebuzz_key +
            '|' +
            collect_request_id +
            '|' +
            amount.toString() +
            '|' +
            email +
            '|' +
            student_phone_no +
            '|' +
            easebuzz_salt;
        let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
        const qs = require('qs');
        const data = qs.stringify({
            txnid: collect_request_id,
            key: easebuzz_key,
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
        if (statusRes.msg === 'Hash mismatch') {
            const oldhashData = easebuzz_key +
                '|' +
                collect_request_id +
                '|' +
                amount.toString() +
                '|' +
                'noreply@edviron.com' +
                '|' +
                '9898989898' +
                '|' +
                easebuzz_salt;
            let oldhash = await (0, sign_1.calculateSHA512Hash)(oldhashData);
            const olddata = qs.stringify({
                txnid: collect_request_id,
                key: easebuzz_key,
                amount: amount,
                email: 'noreply@edviron.com',
                phone: '9898989898',
                hash: oldhash,
            });
            const oldConfig = {
                method: 'POST',
                url: `https://dashboard.easebuzz.in/transaction/v1/retrieve`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: olddata,
            };
            const { data: statusRes } = await axios.request(oldConfig);
            return statusRes;
        }
        return statusRes;
    }
    async createOrderNonseamless(request, platform_charges, school_name) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const { additional_data } = collectReq;
            const studentDetail = JSON.parse(additional_data);
            if (request.isSplitPayments) {
                if (!request.easebuzz_split_label) {
                    throw new common_1.BadRequestException(`Split Information Not Configure Please contact tarun.k@edviron.com`);
                }
                const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
                const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
                const easebuzz_sub_merchant_id = request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
                let productinfo = 'payment gateway customer';
                let firstname = studentDetail.student_details?.student_name || 'customer';
                let email = studentDetail.student_details?.student_email || 'noreply@edviron.com';
                let student_id = studentDetail?.student_details?.student_id || 'N/A';
                let student_phone_no = studentDetail?.student_details?.student_phone_no || 'N/A';
                const additionalData = studentDetail.additional_fields || {};
                const udfValues = [
                    student_id,
                    student_phone_no,
                    ...Object.values(additionalData),
                ];
                const udfPadded = [
                    ...udfValues,
                    ...new Array(10 - udfValues.length).fill(''),
                ].slice(0, 10);
                const hashData = [
                    easebuzz_key,
                    request._id,
                    parseFloat(request.amount.toFixed(2)),
                    productinfo,
                    firstname,
                    email,
                    ...udfPadded,
                    easebuzz_salt,
                ].join('|');
                const easebuzz_cb_surl = process.env.URL +
                    '/easebuzz/non-seamless/callback?collect_request_id=' +
                    request._id +
                    '&status=pass';
                const easebuzz_cb_furl = process.env.URL +
                    '/easebuzz/non-seamless/callback?collect_request_id=' +
                    request._id +
                    '&status=fail';
                let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
                let encodedParams = new URLSearchParams();
                encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
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
                encodedParams.set('sub_merchant_id', easebuzz_sub_merchant_id);
                udfPadded.forEach((val, index) => {
                    encodedParams.set(`udf${index + 1}`, val);
                });
                let ezb_split_payments = {};
                if (request.isSplitPayments &&
                    request.easebuzzVendors &&
                    request.easebuzz_split_label &&
                    request.easebuzzVendors.length > 0) {
                    let vendorTotal = 0;
                    for (const vendor of request.easebuzzVendors) {
                        if (vendor.name && typeof vendor.amount === 'number') {
                            ezb_split_payments[vendor.vendor_id] = vendor.amount;
                            vendorTotal += vendor.amount;
                        }
                        await new this.databaseService.VendorTransactionModel({
                            vendor_id: vendor.vendor_id,
                            amount: vendor.amount,
                            collect_id: request._id,
                            gateway: collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ,
                            status: transactionStatus_1.TransactionStatus.PENDING,
                            trustee_id: request.trustee_id,
                            school_id: request.school_id,
                            custom_order_id: request.custom_order_id || '',
                            name: vendor.name,
                        }).save();
                    }
                    const remainingAmount = request.amount - vendorTotal;
                    if (remainingAmount > 0) {
                        ezb_split_payments[request.easebuzz_split_label] = remainingAmount;
                    }
                    encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
                }
                else {
                    ezb_split_payments[request.easebuzz_split_label] = request.amount;
                    encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
                }
                const Ezboptions = {
                    method: 'POST',
                    url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                    data: encodedParams,
                };
                const disabled_modes_string = request.disabled_modes
                    .map((mode) => `${mode}=false`)
                    .join('&');
                const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
                const { data: easebuzzRes } = await axios_1.default.request(Ezboptions);
                const easebuzzPaymentId = easebuzzRes.data;
                collectReq.paymentIds.easebuzz_id = easebuzzPaymentId;
                await collectReq.save();
                await this.getQr(request._id.toString(), request, ezb_split_payments);
                return {
                    collect_request_id: request._id,
                    collect_request_url: `${process.env.URL}/easebuzz/redirect?&collect_id=${request._id}&easebuzzPaymentId=${easebuzzPaymentId}`,
                };
            }
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async createOrderNonSplitNonSeamless(request, platform_charges, school_name, easebuzz_school_label) {
        try {
            console.log('11');
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            console.log('debud');
            const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
            const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
            const easebuzz_sub_merchant_id = request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
            let productinfo = 'payment gateway customer';
            const { additional_data } = collectReq;
            const studentDetail = JSON.parse(additional_data);
            let firstname = (studentDetail.student_details?.student_name || 'customer').trim();
            let email = studentDetail.student_details?.student_email || 'noreply@edviron.com';
            let student_id = studentDetail?.student_details?.student_id || 'NA';
            let student_phone_no = studentDetail?.student_details?.student_phone_no || '0000000000';
            const additionalData = studentDetail.additional_fields || {};
            const udfValues = [
                student_id,
                student_phone_no,
                ...Object.values(additionalData),
            ];
            const udfPadded = [
                ...udfValues,
                ...new Array(10 - udfValues.length).fill(''),
            ].slice(0, 10);
            const hashData = [
                easebuzz_key,
                request._id.toString(),
                parseFloat(request.amount.toFixed(2)),
                productinfo,
                firstname,
                email,
                ...udfPadded,
                easebuzz_salt,
            ].join('|');
            const easebuzz_cb_surl = process.env.URL +
                '/easebuzz/non-seamless/callback/?collect_request_id=' +
                request._id +
                '&status=pass';
            const easebuzz_cb_furl = process.env.URL +
                '/easebuzz/non-seamless/callback/?collect_request_id=' +
                request._id +
                '&status=fail';
            let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
            let encodedParams = new URLSearchParams();
            encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
            encodedParams.set('txnid', request._id.toString());
            encodedParams.set('amount', parseFloat(request.amount.toFixed(2)).toString());
            encodedParams.set('productinfo', productinfo);
            encodedParams.set('firstname', firstname);
            encodedParams.set('phone', student_phone_no);
            encodedParams.set('email', email);
            encodedParams.set('surl', easebuzz_cb_surl);
            encodedParams.set('furl', easebuzz_cb_furl);
            encodedParams.set('hash', hash);
            encodedParams.set('request_flow', 'SEAMLESS');
            udfPadded.forEach((val, index) => {
                encodedParams.set(`udf${index + 1}`, val);
            });
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
            const Ezboptions = {
                method: 'POST',
                url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: encodedParams,
            };
            const { data: easebuzzRes } = await axios_1.default.request(Ezboptions);
            console.log(easebuzzRes, 'ressss');
            const easebuzzPaymentId = easebuzzRes.data;
            collectReq.paymentIds.easebuzz_id = easebuzzPaymentId;
            await collectReq.save();
            await this.getQrNonSplit(request._id.toString(), request);
            return {
                collect_request_id: request._id,
                collect_request_url: `${process.env.URL}/easebuzz/redirect?&collect_id=${request._id}&easebuzzPaymentId=${easebuzzPaymentId}`,
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async createOrderSeamlessNonSplit(request) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
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
            const Ezboptions = {
                method: 'POST',
                url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: encodedParams,
            };
            const { data: easebuzzRes } = await axios_1.default.request(Ezboptions);
            const easebuzzPaymentId = easebuzzRes.data;
            await this.getQrNonSplit(request._id.toString(), request);
            return easebuzzPaymentId;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async netBankingSeamless(collect_id, selectedBank) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Invalid Collect Id');
            }
            const easebuzzPaymentId = collectReq.paymentIds.easebuzz_id;
            if (!easebuzzPaymentId) {
                throw new common_1.BadRequestException('Invalid Payment');
            }
            const htmlForm = `
     <script type="text/javascript">
        window.onload = function() {
          // Create a hidden form dynamically
          var form = document.createElement("form");
          form.method = "POST";
          form.action = "https://pay.easebuzz.in/initiate_seamless_payment/";

          var input1 = document.createElement("input");
          input1.type = "hidden";
          input1.name = "access_key";
          input1.value = "${easebuzzPaymentId}";
          form.appendChild(input1);

          var input2 = document.createElement("input");
          input2.type = "hidden";
          input2.name = "payment_mode";
          input2.value = "NB";
          form.appendChild(input2);

          var input3 = document.createElement("input");
          input3.type = "hidden";
          input3.name = "bank_code";
          input3.value = "${selectedBank}";
          form.appendChild(input3);

          document.body.appendChild(form);
          form.submit();
        }
      </script>

    `;
            return htmlForm;
        }
        catch (e) {
            console.error(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async encCard(merchant_id, pg_key, data) {
        try {
            const { key, iv } = await (0, sign_1.merchantKeyIv)(merchant_id, pg_key);
            const end_data = await (0, sign_1.encryptCard)(data, key, iv);
            return end_data;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async easebuzzEncryption(card_number, card_holder, card_cvv, card_exp, collect_id) {
        try {
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.BadRequestException('Collect Request not found');
            }
            const { key, iv } = await (0, sign_1.merchantKeySHA256)(request);
            const enc_card_number = await (0, sign_1.encryptCard)(card_number, key, iv);
            const enc_card_holder = await (0, sign_1.encryptCard)(card_holder, key, iv);
            const enc_card_cvv = await (0, sign_1.encryptCard)(card_cvv, key, iv);
            const enc_card_exp = await (0, sign_1.encryptCard)(card_exp, key, iv);
            return {
                card_number: enc_card_number,
                card_holder: enc_card_holder,
                card_cvv: enc_card_cvv,
                card_exp: enc_card_exp,
            };
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async processcards(card_number, card_holder_name, card_cvv, card_expiry_date) {
        try {
        }
        catch (e) { }
    }
    async createOrderSeamlessSplit(request) {
        try {
            if (!request.easebuzz_split_label) {
                throw new common_1.BadRequestException(`Split Information Not Configure Please contact tarun.k@edviron.com`);
            }
            const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
            const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
            const easebuzz_sub_merchant_id = request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
            let productinfo = 'payment gateway customer';
            let firstname = 'customer';
            let email = 'noreply@edviron.com';
            let hashData = easebuzz_key +
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
                easebuzz_salt;
            const easebuzz_cb_surl = process.env.URL +
                '/easebuzz/easebuzz-callback?collect_request_id=' +
                request._id +
                '&status=pass';
            const easebuzz_cb_furl = process.env.URL +
                '/easebuzz/easebuzz-callback?collect_request_id=' +
                request._id +
                '&status=fail';
            let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
            let encodedParams = new URLSearchParams();
            encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
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
            let ezb_split_payments = {};
            if (request.isSplitPayments &&
                request.easebuzzVendors &&
                request.easebuzz_split_label &&
                request.easebuzzVendors.length > 0) {
                let vendorTotal = 0;
                for (const vendor of request.easebuzzVendors) {
                    if (vendor.name && typeof vendor.amount === 'number') {
                        ezb_split_payments[vendor.vendor_id] = vendor.amount;
                        vendorTotal += vendor.amount;
                    }
                    await new this.databaseService.VendorTransactionModel({
                        vendor_id: vendor.vendor_id,
                        amount: vendor.amount,
                        collect_id: request._id,
                        gateway: collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ,
                        status: transactionStatus_1.TransactionStatus.PENDING,
                        trustee_id: request.trustee_id,
                        school_id: request.school_id,
                        custom_order_id: request.custom_order_id || '',
                        name: vendor.name,
                    }).save();
                }
                const remainingAmount = request.amount - vendorTotal;
                if (remainingAmount > 0) {
                    ezb_split_payments[request.easebuzz_split_label] = remainingAmount;
                }
                encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
            }
            else {
                ezb_split_payments[request.easebuzz_split_label] = request.amount;
                encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
            }
            const Ezboptions = {
                method: 'POST',
                url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: encodedParams,
            };
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            const { data: easebuzzRes } = await axios_1.default.request(Ezboptions);
            console.log({ easebuzzRes });
            const easebuzzPaymentId = easebuzzRes.data;
            await this.getQrNonSplit(request._id.toString(), request);
            return easebuzzPaymentId;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async createOrderV3(request, platform_charges, school_name) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const { additional_data } = collectReq;
            if (request.isSplitPayments) {
                if (!request.easebuzz_split_label) {
                    throw new common_1.BadRequestException(`Split Information Not Configure Please contact tarun.k@edviron.com`);
                }
                const studentDetail = JSON.parse(additional_data);
                const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
                const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
                const easebuzz_sub_merchant_id = request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
                let productinfo = 'payment gateway customer';
                let firstname = studentDetail.student_details?.student_name || 'customer';
                let email = studentDetail.student_details?.student_email || 'noreply@edviron.com';
                let student_id = studentDetail?.student_details?.student_id || 'NA';
                let student_phone_no = studentDetail?.student_details?.student_phone_no || 'NA';
                let hashData = easebuzz_key +
                    '|' +
                    request._id +
                    '|' +
                    parseFloat(request.amount.toFixed(2)) +
                    '|' +
                    productinfo +
                    '|' +
                    firstname +
                    '|' +
                    student_id +
                    '|' +
                    student_phone_no +
                    '|' +
                    email +
                    '|||||||||||' +
                    easebuzz_salt;
                const easebuzz_cb_surl = process.env.URL +
                    '/easebuzz/easebuzz-callback?collect_request_id=' +
                    request._id +
                    '&status=pass';
                const easebuzz_cb_furl = process.env.URL +
                    '/easebuzz/easebuzz-callback?collect_request_id=' +
                    request._id +
                    '&status=fail';
                let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
                let encodedParams = new URLSearchParams();
                encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
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
                encodedParams.set('udf1', student_id);
                encodedParams.set('udf2', student_phone_no);
                let ezb_split_payments = {};
                if (request.isSplitPayments &&
                    request.easebuzzVendors &&
                    request.easebuzz_split_label &&
                    request.easebuzzVendors.length > 0) {
                    let vendorTotal = 0;
                    for (const vendor of request.easebuzzVendors) {
                        if (vendor.name && typeof vendor.amount === 'number') {
                            ezb_split_payments[vendor.vendor_id] = vendor.amount;
                            vendorTotal += vendor.amount;
                        }
                        await new this.databaseService.VendorTransactionModel({
                            vendor_id: vendor.vendor_id,
                            amount: vendor.amount,
                            collect_id: request._id,
                            gateway: collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ,
                            status: transactionStatus_1.TransactionStatus.PENDING,
                            trustee_id: request.trustee_id,
                            school_id: request.school_id,
                            custom_order_id: request.custom_order_id || '',
                            name: vendor.name,
                        }).save();
                    }
                    const remainingAmount = request.amount - vendorTotal;
                    if (remainingAmount > 0) {
                        ezb_split_payments[request.easebuzz_split_label] = remainingAmount;
                    }
                    encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
                }
                else {
                    ezb_split_payments[request.easebuzz_split_label] = request.amount;
                    encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
                }
                const Ezboptions = {
                    method: 'POST',
                    url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                    data: encodedParams,
                };
                const disabled_modes_string = request.disabled_modes
                    .map((mode) => `${mode}=false`)
                    .join('&');
                const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
                const { data: easebuzzRes } = await axios_1.default.request(Ezboptions);
                console.log({ easebuzzRes });
                const easebuzzPaymentId = easebuzzRes.data;
                await this.getQr(request._id.toString(), request, ezb_split_payments);
                return easebuzzPaymentId;
            }
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async createOrderV3NonSplit(request, platform_charges, school_name, easebuzz_school_label, isMasterGateway) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const { additional_data } = collectReq;
            const studentDetail = JSON.parse(additional_data);
            console.log('debud');
            const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
            const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
            const easebuzz_sub_merchant_id = request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
            console.log(studentDetail, 'ss');
            let productinfo = 'payment gateway customer';
            let firstname = (studentDetail.student_details?.student_name || 'customer').trim();
            let email = studentDetail.student_details?.student_email || 'noreply@edviron.com';
            let student_id = studentDetail?.student_details?.student_id || 'NA';
            let student_phone_no = studentDetail?.student_details?.student_phone_no || '0000000000';
            let hashData = easebuzz_key +
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
                '|' +
                student_id +
                '|' +
                student_phone_no +
                '|' +
                '||||||||' +
                easebuzz_salt;
            const easebuzz_cb_surl = process.env.URL +
                '/easebuzz/easebuzz-callback/?collect_request_id=' +
                request._id +
                '&status=pass';
            const easebuzz_cb_furl = process.env.URL +
                '/easebuzz/easebuzz-callback/?collect_request_id=' +
                request._id +
                '&status=fail';
            let hash = await (0, sign_1.calculateSHA512Hash)(hashData);
            let encodedParams = new URLSearchParams();
            encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
            encodedParams.set('txnid', request._id.toString());
            encodedParams.set('amount', parseFloat(request.amount.toFixed(2)).toString());
            encodedParams.set('productinfo', productinfo);
            encodedParams.set('firstname', firstname);
            encodedParams.set('phone', student_phone_no);
            encodedParams.set('email', email);
            encodedParams.set('surl', easebuzz_cb_surl);
            encodedParams.set('furl', easebuzz_cb_furl);
            encodedParams.set('hash', hash);
            encodedParams.set('request_flow', 'SEAMLESS');
            encodedParams.set('udf1', student_id);
            encodedParams.set('udf2', student_phone_no);
            let ezb_split_payments = {};
            if (request.easebuzz_split_label) {
                ezb_split_payments[request.easebuzz_split_label] = request.amount;
                encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
            }
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
            const Ezboptions = {
                method: 'POST',
                url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                data: encodedParams,
            };
            const { data: easebuzzRes } = await axios_1.default.request(Ezboptions);
            const easebuzzPaymentId = easebuzzRes.data;
            await this.getQrNonSplit(request._id.toString(), request);
            const schoolName = school_name.replace(/ /g, '_');
            return easebuzzPaymentId;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.EasebuzzService = EasebuzzService;
exports.EasebuzzService = EasebuzzService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EasebuzzService);
//# sourceMappingURL=easebuzz.service.js.map