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
exports.EasebuzzController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const axios_1 = require("axios");
const jwt = require("jsonwebtoken");
const sign_1 = require("../utils/sign");
const sign_2 = require("../utils/sign");
const easebuzz_service_1 = require("./easebuzz.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const mongoose_1 = require("mongoose");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
let EasebuzzController = class EasebuzzController {
    constructor(easebuzzService, databaseService, edvironPgService) {
        this.easebuzzService = easebuzzService;
        this.databaseService = databaseService;
        this.edvironPgService = edvironPgService;
    }
    async redirect(collect_id, easebuzzPaymentId, res) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest)
                throw new common_1.BadRequestException('Order Id not found');
            if (!easebuzzPaymentId) {
                throw new common_1.BadRequestException('payment url not found');
            }
            res.redirect(`${process.env.EASEBUZZ_ENDPOINT_PROD}/pay/${easebuzzPaymentId}`);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async getQr(res, req) {
        try {
            const collect_id = req.query.collect_id;
            if (!collect_id) {
                throw new common_1.NotFoundException('collect_id not found');
            }
            const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id).select('deepLink');
            if (!collectReq) {
                throw new common_1.NotFoundException('Collect request not found');
            }
            const baseUrl = collectReq.deepLink;
            const phonePe = baseUrl.replace('upi:', 'phonepe:');
            const paytm = baseUrl.replace('upi:', 'paytmmp:');
            const gpay = baseUrl.replace('upi://', 'upi:/');
            const googlePe = 'tez://' + gpay;
            return res.send({
                qr_code: collectReq.deepLink,
                phonePe,
                googlePe,
                paytm,
            });
        }
        catch (error) {
            console.log(error);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getEncryptedInfo(res, req, body) {
        const { card_number, card_holder, card_cvv, card_exp, collect_id } = req.query;
        if (!card_number || !card_holder || !card_cvv || !card_exp) {
            throw new common_1.BadRequestException('Card details are required');
        }
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new common_1.BadRequestException('Collect Request not found');
        }
        console.log('encrypting key and iv');
        const { key, iv } = await (0, sign_1.merchantKeySHA256)(request);
        console.log('key and iv generated', { key, iv });
        console.log(`encrypting data: ${card_number}`);
        const enc_card_number = await (0, sign_2.encryptCard)(card_number, key, iv);
        const enc_card_holder = await (0, sign_2.encryptCard)(card_holder, key, iv);
        const enc_card_cvv = await (0, sign_2.encryptCard)(card_cvv, key, iv);
        const enc_card_exp = await (0, sign_2.encryptCard)(card_exp, key, iv);
        const decrypt_card_number = await (0, sign_1.decrypt)(enc_card_number, key, iv);
        const decrypt_cvv = await (0, sign_1.decrypt)(enc_card_cvv, key, iv);
        const decrypt_exp = await (0, sign_1.decrypt)(enc_card_exp, key, iv);
        const decrypt_card_holder_name = await (0, sign_1.decrypt)(enc_card_holder, key, iv);
        console.log(decrypt_card_holder_name, decrypt_cvv, decrypt_card_number, decrypt_exp);
        return res.send({
            card_number: enc_card_number,
            card_holder: enc_card_holder,
            card_cvv: enc_card_cvv,
            card_exp: enc_card_exp,
        });
    }
    async getRefundhash(req) {
        const { collect_id, refund_amount, refund_id } = req.query;
        const hashStringV2 = `${process.env.EASEBUZZ_KEY}|${refund_id}|${collect_id}|${parseFloat(refund_amount)
            .toFixed(1)
            .toString()}|${process.env.EASEBUZZ_SALT}`;
        let hash2 = await (0, sign_1.calculateSHA512Hash)(hashStringV2);
        const data2 = {
            key: process.env.EASEBUZZ_KEY,
            merchant_refund_id: refund_id,
            easebuzz_id: collect_id,
            refund_amount: parseFloat(refund_amount).toFixed(1),
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
            const response = await (0, axios_1.default)(config);
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async checkRefund(req) {
        return await this.easebuzzService.checkRefundSttaus(req.query.collect_id);
    }
    async settlementRecon(body) {
        try {
            const { submerchant_id, start_date, end_date, page_size, token } = body;
            if (!token)
                throw new common_1.BadRequestException('Token is required');
            const data = jwt.verify(token, process.env.PAYMENTS_SERVICE_SECRET);
            if (!data)
                throw new common_1.BadRequestException('Request Forged');
            if (data.submerchant_id !== submerchant_id)
                throw new common_1.BadRequestException('Request Forged');
            const hashString = `${process.env.EASEBUZZ_KEY}|${start_date}|${end_date}|${process.env.EASEBUZZ_SALT}`;
            const hash = await (0, sign_1.calculateSHA512Hash)(hashString);
            const payload = {
                merchant_key: process.env.EASEBUZZ_KEY,
                payout_date: {
                    start_date,
                    end_date,
                },
                page_size,
                hash,
                submerchant_id,
            };
            const config = {
                method: 'post',
                url: `https://dashboard.easebuzz.in/settlements/v1/retrieve`,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                data: payload,
            };
            const { data: resData } = await axios_1.default.request(config);
            const orderIds = resData?.data[0]?.peb_transactions.map((data) => data?.txnid);
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
            const enrichedOrders = resData?.data[0]?.peb_transactions.map((order) => {
                let customData = {};
                let additionalData = {};
                if (order.txnid) {
                    customData = customOrderMap.get(order.txnid) || {};
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
                transactions: enrichedOrders,
                split_payouts: resData?.data[0]?.split_payouts,
                peb_refunds: resData?.data[0]?.peb_refunds,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something Went Wrong');
        }
    }
    async settlementReconV2(body) {
        try {
            const { submerchant_id, start_date, end_date, page_size, token, easebuzz_key, easebuzz_salt, utr } = body;
            if (!token)
                throw new common_1.BadRequestException('Token is required');
            const data = jwt.verify(token, process.env.PAYMENTS_SERVICE_SECRET);
            if (!data)
                throw new common_1.BadRequestException('Request Forged');
            if (data.submerchant_id !== submerchant_id)
                throw new common_1.BadRequestException('Request Forged');
            const hashString = `${easebuzz_key}|${start_date}|${end_date}|${easebuzz_salt}`;
            console.log(hashString);
            const hash = await (0, sign_1.calculateSHA512Hash)(hashString);
            const payload = {
                merchant_key: easebuzz_key,
                payout_date: {
                    start_date,
                    end_date,
                },
                hash,
            };
            const config = {
                method: 'post',
                url: `https://dashboard.easebuzz.in/settlements/v1/retrieve`,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                data: payload,
            };
            console.log(config);
            const { data: resData } = await axios_1.default.request(config);
            const record = resData.data.find((item) => item.bank_transaction_id === utr);
            console.log(record, utr, 'test');
            const orderIds = record.peb_transactions.map((tx) => {
                console.log(tx.txnid, 'txid');
                if (tx?.txnid?.startsWith("upi_")) {
                    return tx.txnid.replace("upi_", "");
                }
                return tx?.txnid;
            });
            console.log(orderIds, 'orderIds');
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
            const enrichedOrders = await Promise.all(record.peb_transactions.map(async (order) => {
                let customData = {};
                let additionalData = {};
                let collect_id = order.txnid;
                if (collect_id.startsWith("upi_")) {
                    collect_id = collect_id.replace("upi_", "");
                }
                if (collect_id) {
                    customData = customOrderMap.get(collect_id) || {};
                    additionalData = JSON.parse(customData?.additional_data);
                }
                const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id);
                const collectStatus = await this.databaseService.CollectRequestStatusModel.findOne({ collect_id: new mongoose_1.Types.ObjectId(collect_id) });
                return {
                    ...order,
                    custom_order_id: customData.custom_order_id || null,
                    order_id: collectReq?._id || null,
                    event_status: order?.status || null,
                    event_settlement_amount: order.peb_settlement_amount || null,
                    order_amount: collectStatus?.order_amount || null,
                    event_amount: order?.amount || null,
                    event_time: collectStatus?.payment_time || collectStatus?.updatedAt || null,
                    payment_group: collectStatus?.payment_method || order?.transaction_type || null,
                    settlement_utr: utr || null,
                    school_id: customData.school_id || null,
                    student_id: additionalData?.student_details?.student_id || null,
                    student_name: additionalData.student_details?.student_name || null,
                    student_email: additionalData.student_details?.student_email || null,
                    student_phone_no: additionalData.student_details?.student_phone_no || null,
                };
            }));
            console.log(enrichedOrders, 'enchrichedOrders');
            return {
                transactions: enrichedOrders,
                split_payouts: resData?.data[0]?.split_payouts,
                peb_refunds: resData?.data[0]?.peb_refunds,
            };
        }
        catch (error) {
            console.log(error.response?.data);
            throw new common_1.BadRequestException(error.message || 'Something Went Wrong');
        }
    }
    async updateEasebuzzDispute(body) {
        try {
            const { case_id, action, reason, documents, sign } = body;
            const decodedToken = jwt.verify(sign, process.env.KEY);
            if (!decodedToken)
                throw new common_1.BadRequestException('Request Forged');
            if (decodedToken.action !== action || decodedToken.case_id !== case_id)
                throw new common_1.BadRequestException('Request Forged');
            const data = await this.easebuzzService.updateDispute(case_id, action, reason, documents);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
    async createOrderV2(body) {
        const { amount, callbackUrl, jwt, webHook, disabled_modes, platform_charges, additional_data, school_id, trustee_id, custom_order_id, req_webhook_urls, school_name, easebuzz_sub_merchant_id, split_payments, easebuzzVendors, easebuzz_school_label, easebuzz_non_partner_cred, } = body;
        try {
            if (custom_order_id) {
                const count = await this.databaseService.CollectRequestModel.countDocuments({
                    school_id,
                    custom_order_id,
                });
                if (count > 0) {
                    throw new common_1.ConflictException('OrderId must be unique');
                }
            }
            console.log(easebuzz_non_partner_cred);
            if (!easebuzz_non_partner_cred) {
                throw new common_1.BadRequestException('EASEBUZZ CREDENTIAL IS MISSING');
            }
            if (!easebuzz_non_partner_cred.easebuzz_key ||
                !easebuzz_non_partner_cred.easebuzz_merchant_email ||
                !easebuzz_non_partner_cred.easebuzz_salt ||
                !easebuzz_non_partner_cred.easebuzz_submerchant_id) {
                throw new common_1.BadRequestException('EASEBUZZ CREDENTIAL IS MISSING');
            }
            const request = await new this.databaseService.CollectRequestModel({
                amount,
                callbackUrl,
                gateway: collect_request_schema_1.Gateway.PENDING,
                webHookUrl: webHook || null,
                disabled_modes,
                school_id,
                trustee_id,
                additional_data: JSON.stringify(additional_data),
                custom_order_id,
                req_webhook_urls,
                easebuzz_sub_merchant_id: easebuzz_non_partner_cred.easebuzz_submerchant_id,
                easebuzzVendors,
                paymentIds: { easebuzz_id: null },
                easebuzz_non_partner: true,
                easebuzz_non_partner_cred,
                isSplitPayments: split_payments,
                easebuzz_split_label: easebuzz_school_label,
            }).save();
            await new this.databaseService.CollectRequestStatusModel({
                collect_id: request._id,
                status: collect_req_status_schema_1.PaymentStatus.PENDING,
                order_amount: request.amount,
                transaction_amount: request.amount,
                payment_method: null,
            }).save();
            const schoolName = school_name || '';
            if (split_payments) {
                console.log(split_payments);
                return (0, sign_1.sign)(await this.easebuzzService.createOrderV2(request, platform_charges, schoolName));
            }
            console.log('nonsplit');
            return (0, sign_1.sign)(await this.easebuzzService.createOrderV2NonSplit(request, platform_charges, schoolName, easebuzz_school_label || null));
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async createOrderNonSeamless(body) {
        const { amount, callbackUrl, jwt, webHook, disabled_modes, platform_charges, additional_data, school_id, trustee_id, custom_order_id, req_webhook_urls, school_name, easebuzz_sub_merchant_id, split_payments, easebuzzVendors, easebuzz_school_label, easebuzz_non_partner_cred, } = body;
        try {
            if (custom_order_id) {
                const count = await this.databaseService.CollectRequestModel.countDocuments({
                    school_id,
                    custom_order_id,
                });
                if (count > 0) {
                    throw new common_1.ConflictException('OrderId must be unique');
                }
            }
            console.log(easebuzz_non_partner_cred);
            if (!easebuzz_non_partner_cred) {
                throw new common_1.BadRequestException('EASEBUZZ CREDENTIAL IS MISSING');
            }
            if (!easebuzz_non_partner_cred.easebuzz_key ||
                !easebuzz_non_partner_cred.easebuzz_merchant_email ||
                !easebuzz_non_partner_cred.easebuzz_salt ||
                !easebuzz_non_partner_cred.easebuzz_submerchant_id) {
                throw new common_1.BadRequestException('EASEBUZZ CREDENTIAL IS MISSING');
            }
            const request = await new this.databaseService.CollectRequestModel({
                amount,
                callbackUrl,
                gateway: collect_request_schema_1.Gateway.PENDING,
                webHookUrl: webHook || null,
                disabled_modes,
                school_id,
                trustee_id,
                additional_data: JSON.stringify(additional_data),
                custom_order_id,
                req_webhook_urls,
                easebuzz_sub_merchant_id: easebuzz_non_partner_cred.easebuzz_submerchant_id,
                easebuzzVendors,
                paymentIds: { easebuzz_id: null },
                easebuzz_non_partner: true,
                easebuzz_non_partner_cred,
                isSplitPayments: split_payments,
                easebuzz_split_label: easebuzz_school_label,
            }).save();
            await new this.databaseService.CollectRequestStatusModel({
                collect_id: request._id,
                status: collect_req_status_schema_1.PaymentStatus.PENDING,
                order_amount: request.amount,
                transaction_amount: request.amount,
                payment_method: null,
            }).save();
            const schoolName = school_name || '';
            if (split_payments) {
                console.log(split_payments);
                return (0, sign_1.sign)(await this.easebuzzService.createOrderNonseamless(request, platform_charges, schoolName));
            }
            console.log('nonsplit');
            return (0, sign_1.sign)(await this.easebuzzService.createOrderNonSplitNonSeamless(request, platform_charges, schoolName, easebuzz_school_label || null));
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
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
        const statusResponse = await this.easebuzzService.easebuzzWebhookCheckStatusV2(body.txnid, collectReq);
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
    async handleEasebuzzCallback(req, res) {
        const { collect_request_id } = req.query;
        console.log(req.query.status, 'easebuzz callback status');
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
        await collectRequest.save();
        const statusResponse = await this.easebuzzService.statusResponsev2(collect_request_id, collectRequest);
        const reqToCheck = statusResponse;
        console.log(statusResponse, 'status response check');
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
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async handleEasebuzzCallbackPost(req, res) {
        const { collect_request_id } = req.query;
        console.log(req.query.status, 'easebuzz callback status');
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
        await collectRequest.save();
        const statusResponse = await this.easebuzzService.statusResponsev2(collect_request_id, collectRequest);
        const reqToCheck = statusResponse;
        console.log(statusResponse, 'status response check');
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
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async handleEasebuzzNonSeamlessCallbackPost(body, req, res) {
        const { collect_request_id } = req.query;
        const collectIdObject = new mongoose_1.Types.ObjectId(collect_request_id);
        console.log(req.query.status, 'easebuzz callback status');
        const saveWebhook = await new this.databaseService.WebhooksModel({
            collect_id: collectIdObject,
            body: JSON.stringify(body),
        }).save();
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
        await collectRequest.save();
        const transaction_amount = body.net_amount_debit || null;
        const statusResponse = await this.easebuzzService.statusResponsev2(collect_request_id, collectRequest);
        let payment_method;
        let details;
        const reqToCheck = statusResponse;
        console.log(statusResponse, 'status response check');
        const status = reqToCheck.msg.status;
        const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        if (pendingCollectReq &&
            pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
            console.log('No pending request found for', collect_request_id);
            const callbackUrl = new URL(collectRequest?.callbackUrl);
            callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
            callbackUrl.searchParams.set('status', pendingCollectReq.status.toString());
            return res.redirect(callbackUrl.toString());
        }
        if (collectRequest.school_id === '65d443168b8aa46fcb5af3e4') {
            try {
                if (pendingCollectReq &&
                    pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING &&
                    pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                    console.log('Auto Refund for Duplicate Payment ', collect_request_id);
                    const tokenData = {
                        school_id: collectRequest?.school_id,
                        trustee_id: collectRequest?.trustee_id,
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
                            refund_amount: collectRequest.amount,
                            collect_id: collect_request_id,
                            school_id: collectRequest.school_id,
                            trustee_id: collectRequest?.trustee_id,
                            custom_id: collectRequest.custom_order_id || 'NA',
                            gateway: 'EASEBUZZ',
                            reason: 'Auto Refund due to dual payment',
                        },
                    };
                    const autoRefundResponse = await axios_1.default.request(autoRefundConfig);
                    console.log(autoRefundResponse.data, 'refund');
                    const refund_id = autoRefundResponse.data._id.toString();
                    const refund_amount = autoRefundResponse.data.refund_amount;
                    const refund_process = await this.easebuzzService.initiateRefund(collect_request_id, refund_amount, refund_id);
                    console.log('Auto refund Initiated', refund_process);
                    pendingCollectReq.isAutoRefund = true;
                    pendingCollectReq.status = collect_req_status_schema_1.PaymentStatus.FAILURE;
                    await pendingCollectReq.save();
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
                    callbackUrl.searchParams.set('status', 'SUCCESS');
                    return res.redirect(callbackUrl.toString());
                }
            }
            catch (e) {
                console.log(e);
            }
        }
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
                const schoolInfo = await this.edvironPgService.getSchoolInfo(collectRequest.school_id);
                const email = schoolInfo.email;
            }
            catch (e) {
                console.log('error in sending transaction mail ');
            }
            const payment_mode = body.bank_name;
            const tokenData = {
                school_id: collectRequest?.school_id,
                trustee_id: collectRequest?.trustee_id,
                order_amount: pendingCollectReq?.order_amount,
                transaction_amount,
                platform_type,
                payment_mode,
                collect_id: collectRequest?._id,
            };
            const _jwt = jwt.sign(tokenData, process.env.KEY, { noTimestamp: true });
            let data = JSON.stringify({
                token: _jwt,
                school_id: collectRequest?.school_id,
                trustee_id: collectRequest?.trustee_id,
                order_amount: pendingCollectReq?.order_amount,
                transaction_amount,
                platform_type,
                payment_mode,
                collect_id: collectRequest?._id,
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
            if (collectRequest.isSplitPayments) {
                try {
                    const vendor = await this.databaseService.VendorTransactionModel.updateMany({
                        collect_id: collectRequest._id,
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
        const webHookUrl = collectRequest?.req_webhook_urls;
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
            collect_request_id,
            amount,
            status,
            trustee_id: collectRequest.trustee_id,
            school_id: collectRequest.school_id,
            req_webhook_urls: collectRequest?.req_webhook_urls,
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
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async handleEasebuzzNonSeamlessCallback(body, req, res) {
        const { collect_request_id } = req.query;
        const collectIdObject = new mongoose_1.Types.ObjectId(collect_request_id);
        console.log(req.query.status, 'easebuzz callback status');
        const saveWebhook = await new this.databaseService.WebhooksModel({
            collect_id: collectIdObject,
            body: JSON.stringify(body),
        }).save();
        const collectRequest = (await this.databaseService.CollectRequestModel.findById(collect_request_id));
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ;
        await collectRequest.save();
        const transaction_amount = body.net_amount_debit || null;
        const statusResponse = await this.easebuzzService.statusResponsev2(collect_request_id, collectRequest);
        let payment_method;
        let details;
        const reqToCheck = statusResponse;
        console.log(statusResponse, 'status response check');
        const status = reqToCheck.msg.status;
        const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectIdObject,
        });
        if (pendingCollectReq &&
            pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING) {
            console.log('No pending request found for', collect_request_id);
            res.status(200).send('OK');
            return;
        }
        if (collectRequest.school_id === '65d443168b8aa46fcb5af3e4') {
            try {
                if (pendingCollectReq &&
                    pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.PENDING &&
                    pendingCollectReq.status !== collect_req_status_schema_1.PaymentStatus.SUCCESS) {
                    console.log('Auto Refund for Duplicate Payment ', collect_request_id);
                    const tokenData = {
                        school_id: collectRequest?.school_id,
                        trustee_id: collectRequest?.trustee_id,
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
                            refund_amount: collectRequest.amount,
                            collect_id: collect_request_id,
                            school_id: collectRequest.school_id,
                            trustee_id: collectRequest?.trustee_id,
                            custom_id: collectRequest.custom_order_id || 'NA',
                            gateway: 'EASEBUZZ',
                            reason: 'Auto Refund due to dual payment',
                        },
                    };
                    const autoRefundResponse = await axios_1.default.request(autoRefundConfig);
                    console.log(autoRefundResponse.data, 'refund');
                    const refund_id = autoRefundResponse.data._id.toString();
                    const refund_amount = autoRefundResponse.data.refund_amount;
                    const refund_process = await this.easebuzzService.initiateRefund(collect_request_id, refund_amount, refund_id);
                    console.log('Auto refund Initiated', refund_process);
                    pendingCollectReq.isAutoRefund = true;
                    pendingCollectReq.status = collect_req_status_schema_1.PaymentStatus.FAILURE;
                    await pendingCollectReq.save();
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
                    callbackUrl.searchParams.set('status', 'SUCCESS');
                    return res.redirect(callbackUrl.toString());
                }
            }
            catch (e) {
                console.log(e);
            }
        }
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
                const schoolInfo = await this.edvironPgService.getSchoolInfo(collectRequest.school_id);
                const email = schoolInfo.email;
            }
            catch (e) {
                console.log('error in sending transaction mail ');
            }
            const payment_mode = body.bank_name;
            const tokenData = {
                school_id: collectRequest?.school_id,
                trustee_id: collectRequest?.trustee_id,
                order_amount: pendingCollectReq?.order_amount,
                transaction_amount,
                platform_type,
                payment_mode,
                collect_id: collectRequest?._id,
            };
            const _jwt = jwt.sign(tokenData, process.env.KEY, { noTimestamp: true });
            let data = JSON.stringify({
                token: _jwt,
                school_id: collectRequest?.school_id,
                trustee_id: collectRequest?.trustee_id,
                order_amount: pendingCollectReq?.order_amount,
                transaction_amount,
                platform_type,
                payment_mode,
                collect_id: collectRequest?._id,
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
            if (collectRequest.isSplitPayments) {
                try {
                    const vendor = await this.databaseService.VendorTransactionModel.updateMany({
                        collect_id: collectRequest._id,
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
        const webHookUrl = collectRequest?.req_webhook_urls;
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
            collect_request_id,
            amount,
            status,
            trustee_id: collectRequest.trustee_id,
            school_id: collectRequest.school_id,
            req_webhook_urls: collectRequest?.req_webhook_urls,
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
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
};
exports.EasebuzzController = EasebuzzController;
__decorate([
    (0, common_1.Get)('/redirect'),
    __param(0, (0, common_1.Query)('collect_id')),
    __param(1, (0, common_1.Query)('easebuzzPaymentId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "redirect", null);
__decorate([
    (0, common_1.Get)('/upiqr'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getQr", null);
__decorate([
    (0, common_1.Get)('/encrypted-info'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getEncryptedInfo", null);
__decorate([
    (0, common_1.Get)('/refundhash'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getRefundhash", null);
__decorate([
    (0, common_1.Get)('/refund-status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "checkRefund", null);
__decorate([
    (0, common_1.Post)('/settlement-recon'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "settlementRecon", null);
__decorate([
    (0, common_1.Post)('/settlement-recon/v2'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "settlementReconV2", null);
__decorate([
    (0, common_1.Post)('/update-dispute'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "updateEasebuzzDispute", null);
__decorate([
    (0, common_1.Post)('/create-order-v2'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "createOrderV2", null);
__decorate([
    (0, common_1.Post)('/create-order-nonseamless'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "createOrderNonSeamless", null);
__decorate([
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "easebuzzWebhook", null);
__decorate([
    (0, common_1.Get)('/easebuzz-callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "handleEasebuzzCallback", null);
__decorate([
    (0, common_1.Post)('/easebuzz-callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "handleEasebuzzCallbackPost", null);
__decorate([
    (0, common_1.Post)('/non-seamless/callback'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "handleEasebuzzNonSeamlessCallbackPost", null);
__decorate([
    (0, common_1.Get)('/non-seamless/callback'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "handleEasebuzzNonSeamlessCallback", null);
exports.EasebuzzController = EasebuzzController = __decorate([
    (0, common_1.Controller)('easebuzz'),
    __metadata("design:paramtypes", [easebuzz_service_1.EasebuzzService,
        database_service_1.DatabaseService,
        edviron_pg_service_1.EdvironPgService])
], EasebuzzController);
//# sourceMappingURL=easebuzz.controller.js.map