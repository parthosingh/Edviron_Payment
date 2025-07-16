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
exports.CcavenueService = void 0;
const common_1 = require("@nestjs/common");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const transactionStatus_1 = require("../types/transactionStatus");
const crypto_1 = require("crypto");
const qs = require("qs");
const axios_1 = require("axios");
const database_service_1 = require("../database/database.service");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let CcavenueService = class CcavenueService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    encrypt(plainText, workingKey) {
        const m = (0, crypto_1.createHash)('md5');
        m.update(workingKey);
        const key = m.digest();
        const iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
        const cipher = (0, crypto_1.createCipheriv)('aes-128-cbc', key, iv);
        let encoded = cipher.update(plainText, 'utf8', 'hex');
        encoded += cipher.final('hex');
        return encoded;
    }
    decrypt(encText, workingKey) {
        const m = (0, crypto_1.createHash)('md5');
        m.update(workingKey);
        const key = m.digest();
        const iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
        const decipher = (0, crypto_1.createDecipheriv)('aes-128-cbc', key, iv);
        let decoded = decipher.update(encText, 'hex', 'utf8');
        decoded += decipher.final('utf8');
        return decoded;
    }
    ccavRequestHandler(p_merchant_id, p_order_id, p_currency, p_amount, p_redirect_url, p_cancel_url, p_language, p_billing_name, p_billing_address, p_billing_city, p_billing_state, p_billing_zip, p_billing_country, p_billing_tel, p_billing_email, p_delivery_name, p_delivery_address, p_delivery_city, p_delivery_state, p_delivery_zip, p_delivery_country, p_delivery_tel, p_merchant_param1, p_merchant_param2, p_merchant_param3, p_merchant_param4, p_merchant_param5, p_promo_code, p_customer_identifier, ccavenue_working_key, ccavenue_access_code) {
        const merchant_data = 'merchant_id=' +
            p_merchant_id +
            '&' +
            'order_id=' +
            p_order_id +
            '&' +
            'currency=' +
            p_currency +
            '&' +
            'amount=' +
            p_amount +
            '&' +
            'redirect_url=' +
            p_redirect_url +
            '&' +
            'cancel_url=' +
            p_cancel_url +
            '&' +
            'language=' +
            p_language +
            '&' +
            'billing_name=' +
            p_billing_name +
            '&' +
            'billing_address=' +
            p_billing_address +
            '&' +
            'billing_city=' +
            p_billing_city +
            '&' +
            'billing_state=' +
            p_billing_state +
            '&' +
            'billing_zip=' +
            p_billing_zip +
            '&' +
            'billing_country=' +
            p_billing_country +
            '&' +
            'billing_tel=' +
            p_billing_tel +
            '&' +
            'billing_email=' +
            p_billing_email +
            '&' +
            'delivery_name=' +
            p_delivery_name +
            '&' +
            'delivery_address=' +
            p_delivery_address +
            '&' +
            'delivery_city=' +
            p_delivery_city +
            '&' +
            'delivery_state=' +
            p_delivery_state +
            '&' +
            'delivery_zip=' +
            p_delivery_zip +
            '&' +
            'delivery_country=' +
            p_delivery_country +
            '&' +
            'delivery_tel=' +
            p_delivery_tel +
            '&' +
            'merchant_param1=' +
            p_merchant_param1 +
            '&' +
            'merchant_param2=' +
            p_merchant_param2 +
            '&' +
            'merchant_param3=' +
            p_merchant_param3 +
            '&' +
            'merchant_param4=' +
            p_merchant_param4 +
            '&' +
            'merchant_param5=' +
            p_merchant_param5 +
            '&' +
            'promo_code=' +
            p_promo_code +
            '&' +
            'customer_identifier=' +
            p_customer_identifier +
            '&';
        const encrypted = this.encrypt(merchant_data, ccavenue_working_key);
        return {
            encRequest: encrypted,
            access_code: ccavenue_access_code,
        };
    }
    async createOrder(request) {
        const p_merchant_id = request.ccavenue_merchant_id;
        const p_order_id = request._id.toString();
        const p_currency = 'INR';
        const p_amount = request.amount.toFixed(2);
        const p_redirect_url = process.env.URL +
            '/ccavenue/callback?collect_id=' +
            request._id.toString();
        const p_cancel_url = process.env.URL +
            '/ccavenue/callback?collect_id=' +
            request._id.toString();
        const p_language = 'EN';
        const p_billing_name = '';
        const p_billing_address = '';
        const p_billing_city = '';
        const p_billing_state = '';
        const p_billing_zip = '';
        const p_billing_country = 'India';
        const p_billing_tel = '';
        const p_billing_email = '';
        const p_delivery_name = '';
        const p_delivery_address = '';
        const p_delivery_city = '';
        const p_delivery_state = '';
        const p_delivery_zip = '';
        const p_delivery_country = 'India';
        const p_delivery_tel = '';
        const p_merchant_param1 = '';
        const p_merchant_param2 = '';
        const p_merchant_param3 = '';
        const p_merchant_param4 = '';
        const p_merchant_param5 = '';
        const p_promo_code = '';
        const p_customer_identifier = '';
        const { encRequest, access_code } = this.ccavRequestHandler(p_merchant_id, p_order_id, p_currency, p_amount, p_redirect_url, p_cancel_url, p_language, p_billing_name, p_billing_address, p_billing_city, p_billing_state, p_billing_zip, p_billing_country, p_billing_tel, p_billing_email, p_delivery_name, p_delivery_address, p_delivery_city, p_delivery_state, p_delivery_zip, p_delivery_country, p_delivery_tel, p_merchant_param1, p_merchant_param2, p_merchant_param3, p_merchant_param4, p_merchant_param5, p_promo_code, p_customer_identifier, request.ccavenue_working_key, request.ccavenue_access_code);
        const collectRequest = await this.databaseService.CollectRequestModel.findById(p_order_id);
        const info = {
            url: process.env.URL +
                '/ccavenue/redirect?encRequest=' +
                encRequest +
                '&access_code=' +
                access_code,
        };
        if (collectRequest) {
            collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_CCAVENUE;
            collectRequest.payment_data = info.url;
            await collectRequest.save();
        }
        return {
            url: process.env.URL +
                '/ccavenue/redirect?encRequest=' +
                encRequest +
                '&access_code=' +
                access_code,
        };
    }
    async ccavResponseToCollectRequestId(encResp, ccavenue_working_key) {
        const decResp = this.decrypt(encResp, ccavenue_working_key);
        console.log(decResp);
        const queryString = decResp;
        const params = new URLSearchParams(queryString);
        const paramObject = Object.fromEntries(params.entries());
        return paramObject.order_id;
    }
    async checkStatus(collect_request, collect_request_id) {
        const { ccavenue_working_key, ccavenue_access_code } = collect_request;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        const encrypted_data = await this.encrypt(JSON.stringify({ order_no: collect_request_id }), ccavenue_working_key);
        console.log(ccavenue_working_key, 'collec');
        console.log(`checking status for ccavenue`);
        const collectReqStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectRequest?._id,
        });
        const data = qs.stringify({
            enc_request: encrypted_data,
            access_code: ccavenue_access_code,
            request_type: 'JSON',
            command: 'orderStatusTracker',
            order_no: collect_request_id,
        });
        console.log(ccavenue_access_code);
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://dev-payments.edviron.com/ccavenue/status',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: { data },
        };
        try {
            const res = await axios_1.default.request(config);
            console.log(res.data, 'data');
            const params = new URLSearchParams(res.data);
            const paramObject = Object.fromEntries(params.entries());
            const decrypt_res = this.decrypt(paramObject['enc_response'], ccavenue_working_key);
            const order_status_result = JSON.parse(decrypt_res).Order_Status_Result;
            const paymentInstrument = order_status_result['order_option_type'];
            const paymentInstrumentBank = order_status_result['order_card_name'];
            if ((order_status_result['order_status'] === 'Shipped' ||
                order_status_result['order_status'] === 'Successful') &&
                Math.floor(collectRequest['amount'] - 0) ===
                    Math.floor(order_status_result['order_amt'])) {
                return {
                    status: transactionStatus_1.TransactionStatus.SUCCESS,
                    amount: order_status_result['order_amt'],
                    paymentInstrument,
                    paymentInstrumentBank,
                    decrypt_res,
                    transaction_time: collectReqStatus?.updatedAt?.toISOString() || 'null',
                    bank_ref: order_status_result['order_bank_ref_no'],
                };
            }
            else if (order_status_result['order_status'] === 'Unsuccessful' ||
                order_status_result['order_status'] === 'Aborted' ||
                order_status_result['order_status'] === 'Invalid') {
                return {
                    status: transactionStatus_1.TransactionStatus.FAILURE,
                    amount: order_status_result['order_amt'],
                };
            }
            return {
                status: transactionStatus_1.TransactionStatus.PENDING,
                amount: order_status_result['order_amt'],
                decrypt_res,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.UnprocessableEntityException(err.message);
        }
    }
    async checkStatusProd(collect_request, collect_request_id) {
        const { ccavenue_working_key, ccavenue_access_code } = collect_request;
        console.log('data', { collect_request_id });
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        const encrypted_data = await this.encrypt(JSON.stringify({ order_no: collect_request_id }), ccavenue_working_key);
        const collectReqStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectRequest?._id,
        });
        const data = qs.stringify({
            enc_request: encrypted_data,
            access_code: ccavenue_access_code,
            request_type: 'JSON',
            command: 'orderStatusTracker',
            order_no: collect_request_id,
        });
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://api.ccavenue.com/apis/servlet/DoWebTrans',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: data,
        };
        try {
            console.log('ppp');
            const res = await axios_1.default.request(config);
            console.log(res.data, 'res');
            try {
                await this.databaseService.ErrorLogsModel.create({
                    identifier: collect_request_id,
                    body: res.data || JSON.stringify(res.data)
                });
            }
            catch (e) {
            }
            const params = new URLSearchParams(res.data);
            const paramObject = Object.fromEntries(params.entries());
            const decrypt_res = this.decrypt(paramObject['enc_response'], ccavenue_working_key);
            console.log({ decrypt_res });
            const order_status_result = JSON.parse(decrypt_res).Order_Status_Result;
            const paymentInstrument = order_status_result['order_option_type'];
            const paymentInstrumentBank = order_status_result['order_card_name'];
            if ((order_status_result['order_status'] === 'Shipped' ||
                order_status_result['order_status'] === 'Successful') &&
                Math.floor(collectRequest['amount'] - 0) ===
                    Math.floor(order_status_result['order_amt'])) {
                return {
                    status: transactionStatus_1.TransactionStatus.SUCCESS,
                    amount: order_status_result['order_amt'],
                    transaction_amount: Number(collectReqStatus?.transaction_amount) || null,
                    status_code: '200',
                    paymentInstrument,
                    paymentInstrumentBank,
                    decrypt_res,
                    transaction_time: collectReqStatus?.updatedAt?.toISOString() || 'null',
                    details: {
                        payment_mode: collectReqStatus?.payment_method,
                        bank_ref: collectReqStatus?.bank_reference,
                        transaction_time: collectReqStatus?.updatedAt?.toISOString() || 'null',
                        status: transactionStatus_1.TransactionStatus.SUCCESS,
                    },
                    bank_ref: order_status_result['order_bank_ref_no'],
                };
            }
            else if (order_status_result['order_status'] === 'Unsuccessful' ||
                order_status_result['order_status'] === 'Aborted' ||
                order_status_result['order_status'] === 'Invalid') {
                return {
                    status: transactionStatus_1.TransactionStatus.FAILURE,
                    status_code: '400',
                    amount: order_status_result['order_amt'],
                    decrypt_res
                };
            }
            return {
                status: transactionStatus_1.TransactionStatus.PENDING,
                amount: order_status_result['order_amt'],
                decrypt_res,
            };
        }
        catch (err) {
            console.log(err.response.data);
            if (err?.response?.data) {
                try {
                    await this.databaseService.ErrorLogsModel.create({
                        identifier: collect_request_id,
                        body: err.response.data
                    });
                }
                catch (e) {
                }
            }
            throw new common_1.UnprocessableEntityException(err.message);
        }
    }
};
exports.CcavenueService = CcavenueService;
exports.CcavenueService = CcavenueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CcavenueService);
//# sourceMappingURL=ccavenue.service.js.map