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
exports.RazorpayNonseamlessService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const mongoose_1 = require("mongoose");
const database_service_1 = require("../database/database.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const hdfc_razorpay_service_1 = require("../hdfc_razporpay/hdfc_razorpay.service");
const transactionStatus_1 = require("../types/transactionStatus");
const _jwt = require("jsonwebtoken");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
let RazorpayNonseamlessService = class RazorpayNonseamlessService {
    constructor(databaseService, edvironPgService) {
        this.databaseService = databaseService;
        this.edvironPgService = edvironPgService;
    }
    async createOrder(collectRequest) {
        try {
            const { _id, amount: totalRupees, razorpay, razorpay_vendors_info, additional_data, } = collectRequest;
            const studentDetail = JSON.parse(additional_data);
            const totalPaise = Math.round(totalRupees * 100);
            const data = {
                amount: totalPaise,
                currency: 'INR',
                receipt: _id.toString(),
                notes: {
                    student_name: studentDetail?.student_details?.student_name || 'N/A',
                    student_email: studentDetail?.student_details?.student_email || 'N/A',
                    student_id: studentDetail?.student_details?.student_id || 'N/A',
                    student_phone_no: studentDetail?.student_details?.student_phone_no || 'N/A',
                },
            };
            if (razorpay_vendors_info?.length) {
                let computed = 0;
                const transfers = razorpay_vendors_info.map((v, idx) => {
                    let amtPaise;
                    if (v.amount !== undefined) {
                        amtPaise = Math.round(v.amount * 100);
                    }
                    else if (v.percentage !== undefined) {
                        amtPaise = Math.floor((totalPaise * v.percentage) / 100);
                    }
                    else {
                        throw new Error(`Vendor at index ${idx} must have amount or percentage`);
                    }
                    computed += amtPaise;
                    return {
                        account: v.account,
                        amount: amtPaise,
                        currency: 'INR',
                        notes: v.notes || {},
                        linked_account_notes: v.linked_account_notes,
                        on_hold: v.on_hold,
                        on_hold_until: v.on_hold_until
                            ? Math.floor(v.on_hold_until.getTime() / 1000)
                            : undefined,
                    };
                });
                const remainder = totalPaise - computed;
                if (remainder !== 0 && transfers.length > 0) {
                    transfers[0].amount += remainder;
                }
                data.transfers = transfers;
            }
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.RAZORPAY_URL}/v1/orders`,
                headers: { 'Content-Type': 'application/json' },
                auth: {
                    username: razorpay.razorpay_id,
                    password: razorpay.razorpay_secret,
                },
                data,
            };
            const { data: rpRes } = await axios_1.default.request(config);
            if (rpRes.status !== 'created') {
                throw new common_1.BadRequestException('Failed to create Razorpay order');
            }
            await collectRequest.constructor.updateOne({ _id }, {
                $set: {
                    gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
                    'razorpay.order_id': rpRes.id,
                },
            });
            return {
                url: `${process.env.URL}/razorpay-nonseamless/redirect?collect_id=${_id}`,
                collect_req: collectRequest,
            };
        }
        catch (error) {
            console.error('Error creating Razorpay order:', error);
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async createOrderV2(collectRequest) {
        try {
            const { _id, amount: totalRupees, razorpay, razorpay_vendors_info, additional_data, } = collectRequest;
            const studentDetail = JSON.parse(additional_data);
            const totalPaise = Math.round(totalRupees * 100);
            const data = {
                amount: totalPaise,
                currency: 'INR',
                receipt: _id.toString(),
                notes: {
                    student_name: studentDetail?.student_details?.student_name || 'N/A',
                    student_email: studentDetail?.student_details?.student_email || 'N/A',
                    student_id: studentDetail?.student_details?.student_id || 'N/A',
                    student_phone_no: studentDetail?.student_details?.student_phone_no || 'N/A',
                },
            };
            if (razorpay_vendors_info?.length) {
                let computed = 0;
                const transfers = razorpay_vendors_info.map((v, idx) => {
                    let amtPaise;
                    if (v.amount !== undefined) {
                        amtPaise = Math.round(v.amount * 100);
                    }
                    else if (v.percentage !== undefined) {
                        amtPaise = Math.floor((totalPaise * v.percentage) / 100);
                    }
                    else {
                        throw new Error(`Vendor at index ${idx} must have amount or percentage`);
                    }
                    computed += amtPaise;
                    return {
                        account: v.account,
                        amount: amtPaise,
                        currency: 'INR',
                        notes: v.notes || {},
                        linked_account_notes: v.linked_account_notes,
                        on_hold: v.on_hold,
                        on_hold_until: v.on_hold_until
                            ? Math.floor(v.on_hold_until.getTime() / 1000)
                            : undefined,
                    };
                });
                const remainder = totalPaise - computed;
                if (remainder !== 0 && transfers.length > 0) {
                    transfers[0].amount += remainder;
                }
                data.transfers = transfers;
            }
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.RAZORPAY_URL}/v1/orders`,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': razorpay.razorpay_mid,
                },
                auth: {
                    username: razorpay.razorpay_id,
                    password: razorpay.razorpay_secret,
                },
                data,
            };
            const { data: rpRes } = await axios_1.default.request(config);
            if (rpRes.status !== 'created') {
                throw new common_1.BadRequestException('Failed to create Razorpay order');
            }
            await collectRequest.constructor.updateOne({ _id }, {
                $set: {
                    gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
                    razorpay_partner: true,
                    'razorpay.order_id': rpRes.id,
                },
            });
            return {
                url: `${process.env.URL}/razorpay-nonseamless/redirect/v2?collect_id=${_id}`,
                collect_req: collectRequest,
            };
        }
        catch (error) {
            console.error('Error creating Razorpay order:', error);
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async getPaymentStatus(order_id, collectRequest) {
        try {
            console.log('razorpay hit');
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.RAZORPAY_URL}/v1/orders/${order_id}/payments`,
                headers: {
                    'content-type': 'application/json',
                },
                auth: {
                    username: collectRequest.razorpay.razorpay_id,
                    password: collectRequest.razorpay.razorpay_secret,
                },
            };
            const { data: orderStatus } = await axios_1.default.request(config);
            const items = orderStatus.items || [];
            const capturedItem = items.find((item) => item.status === 'captured');
            if (capturedItem) {
                return await this.formatRazorpayPaymentStatusResponse(capturedItem, collectRequest);
            }
            return await this.formatRazorpayPaymentStatusResponse(items[items.length - 1] || [], collectRequest);
        }
        catch (error) {
            console.log(error);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async formatRazorpayPaymentStatusResponse(response, collectRequest) {
        try {
            const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectRequest._id,
            });
            if (!collectRequestStatus) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            const status = (0, hdfc_razorpay_service_1.formatRazorpayPaymentStatus)(response?.status);
            const statusCode = status === transactionStatus_1.TransactionStatus.SUCCESS
                ? 200
                : status === transactionStatus_1.TransactionStatus.FAILURE
                    ? 400
                    : 202;
            const formattedResponse = {
                status: status,
                amount: response?.amount ? response?.amount / 100 : collectRequest.amount,
                transaction_amount: response?.amount ? response?.amount / 100 : collectRequest.amount,
                status_code: statusCode,
                custom_order_id: collectRequest?.custom_order_id,
                details: {
                    payment_mode: response?.method || null,
                    payment_methods: {},
                    transaction_time: response?.created_at
                        ? new Date(response?.created_at * 1000).toISOString()
                        : null,
                    formattedTransactionDate: response?.created_at
                        ? new Date(response?.created_at * 1000).toISOString().split('T')[0]
                        : null,
                    order_status: status === transactionStatus_1.TransactionStatus.SUCCESS ? 'PAID' : 'PENDING',
                    service_charge: response?.fee ? response?.fee / 100 : null,
                },
                capture_status: response?.captured || null,
            };
            if (response?.method === 'upi') {
                formattedResponse.details.payment_methods['upi'] = response?.upi;
                formattedResponse.details.bank_ref =
                    response?.acquirer_data?.rrn || null;
            }
            if (response?.method === 'card') {
                console.log(response, 'response');
                const cardDetails = response.card;
                formattedResponse.details.payment_mode = cardDetails?.type;
                formattedResponse.details.payment_methods['card'] = {
                    card_bank_name: cardDetails?.issuer || null,
                    card_country: cardDetails?.international ? null : 'IN',
                    card_network: cardDetails?.network || null,
                    card_number: `XXXXXXXXXXXX${cardDetails?.last4}` || null,
                    card_sub_type: cardDetails?.card_type === 'CREDIT' ? 'P' : 'D',
                    card_type: cardDetails?.type,
                    channel: null,
                };
                formattedResponse.details.bank_ref =
                    response?.acquirer_data?.rrn || null;
            }
            if (response?.method === 'netbanking') {
                formattedResponse.details.payment_mode = 'net_banking';
                formattedResponse.details.payment_methods['net_banking'] = {
                    bank: response?.bank || null,
                };
                formattedResponse.details.bank_ref =
                    response?.acquirer_data?.bank_transaction_id || null;
            }
            if (response?.method === 'wallet') {
                formattedResponse.details.payment_methods['wallet'] = {
                    wallet: response?.wallet || null,
                };
                formattedResponse.details.bank_ref =
                    response?.acquirer_data?.transaction_id || null;
            }
            return formattedResponse;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async fetchCardDetailsOfaPaymentFromRazorpay(payment_id, collectRequest) {
        try {
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.RAZORPAY_URL}/payments/${payment_id}/card`,
                auth: {
                    username: collectRequest.razorpay.razorpay_id,
                    password: collectRequest.razorpay.razorpay_secret,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            const { data } = await axios_1.default.request(config);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async refund(collect_id, refundAmount, refund_id) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.BadRequestException('CollectRequest with ID ' + collect_id + ' not found.');
            }
            if (refundAmount > collectRequest.amount) {
                throw new common_1.BadRequestException('Refund amount cannot be greater than the original amount.');
            }
            const status = await this.getPaymentStatus(collectRequest.razorpay.order_id, collectRequest);
            console.log(status, 'status');
            if (status.status !== 'SUCCESS') {
                throw new common_1.BadRequestException('Payment not captured yet.');
            }
            const totalPaise = Math.round(refundAmount * 100);
            const config = {
                method: 'post',
                url: `${process.env.RAZORPAY_URL}/v1/payments/${collectRequest.razorpay.payment_id}/refund`,
                headers: {
                    'Content-Type': 'application/json',
                },
                auth: {
                    username: collectRequest.razorpay.razorpay_id,
                    password: collectRequest.razorpay.razorpay_secret,
                },
                data: {
                    amount: totalPaise,
                },
            };
            const response = await axios_1.default.request(config);
            console.log(response.data, 'refund response');
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error('Razorpay Refund Error:', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                });
                throw new common_1.BadGatewayException(error.response?.data || error.message);
            }
            console.error('Internal Error:', error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async fetchAndStoreAll(authId, authSecret, school_id, trustee_id, params, razorpay_mid) {
        let allOrders = [];
        let skip = params.skip || 0;
        const pageSize = Math.min(params.count || 100, 100);
        let page = 1;
        while (true) {
            const response = await this.fetchOrdersPage(authId, authSecret, pageSize, skip, params);
            const orders = response.items || response;
            const receivedCount = orders?.length || 0;
            if (!orders || receivedCount === 0) {
                break;
            }
            allOrders = [...allOrders, ...orders];
            skip += receivedCount;
            page++;
            if (receivedCount < pageSize) {
                break;
            }
        }
        const notfound = [];
        for (const order of allOrders) {
            const response = await this.retriveRazorpay(authId, authSecret, order.id);
            const payment = response;
            if (response.length === 0) {
                notfound.push(order.id);
                continue;
            }
            const studentDetail = {
                student_details: {
                    student_id: 'N/A',
                    student_email: payment.email || 'N/A',
                    student_name: payment.description || 'N/A',
                    student_phone_no: payment.contact || 'N/A',
                    additional_fields: {},
                },
            };
            const collectRequest = new this.databaseService.CollectRequestModel({
                amount: payment.amount / 100,
                gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
                razorpay: {
                    razorpay_id: authId,
                    razorpay_secret: authSecret,
                    order_id: order.id,
                    payment_id: payment.id,
                    razorpay_mid: razorpay_mid || '',
                },
                custom_order_id: order.receipt,
                additional_data: JSON.stringify(studentDetail),
                school_id: school_id,
                trustee_id: trustee_id,
            });
            let platform_type = '';
            let payment_method = '';
            let details = {};
            switch (payment.method) {
                case 'upi':
                    payment_method = 'upi';
                    platform_type = 'UPI';
                    details = {
                        app: {
                            channel: payment.upi?.payer_account_type || 'NA',
                            upi_id: payment.vpa || 'N/A',
                        },
                    };
                    break;
                case 'card':
                    payment_method =
                        payment.card?.type === 'credit' ? 'crebit_card' : 'debit_card';
                    platform_type =
                        payment.card?.type === 'credit' ? 'CreditCard' : 'DebitCard';
                    details = {
                        card: {
                            card_bank_name: payment.card?.issuer || 'NA',
                            card_network: payment.card?.network || 'N/A',
                            card_number: `XXXX-XXXX-XXXX-${payment.card?.last4 || 'XXXX'}`,
                            card_type: payment_method,
                        },
                    };
                    break;
                case 'netbanking':
                    details = {
                        netbanking: {
                            channel: null,
                            netbanking_bank_code: payment.acquirer_data.bank_transaction_id,
                            netbanking_bank_name: payment.bank,
                        },
                    };
                    break;
                default:
                    platform_type = 'Other';
                    payment_method = payment.method || 'N/A';
                    details = {};
            }
            const collectRequestStatus = new this.databaseService.CollectRequestStatusModel({
                order_amount: payment.amount / 100,
                transaction_amount: payment.amount / 100,
                payment_method: payment_method,
                status: payment.status === 'captured'
                    ? collect_req_status_schema_1.PaymentStatus.SUCCESS
                    : collect_req_status_schema_1.PaymentStatus.FAIL,
                collect_id: collectRequest._id,
                payment_message: payment.error_description || 'Payment Successful',
                payment_time: new Date(payment.created_at * 1000),
                bank_reference: payment.acquirer_data?.rrn || '',
                details: JSON.stringify(details),
            });
            await collectRequest.save();
            await collectRequestStatus.save();
        }
        return allOrders;
    }
    async retriveRazorpay(authId, authSecret, order_id) {
        const config = {
            method: 'get',
            url: `${process.env.RAZORPAY_URL}/v1/orders/${order_id}/payments`,
            headers: { 'Content-Type': 'application/json' },
            auth: { username: authId, password: authSecret },
        };
        const response = await axios_1.default.request(config);
        return response.data.items[0] || [];
    }
    async fetchOrdersPage(authId, authSecret, count, skip, extraParams = {}) {
        try {
            const requestParams = {
                ...extraParams,
                count,
                skip,
            };
            console.log('[REQUEST] Razorpay API call params:', {
                ...requestParams,
                from: requestParams.from
                    ? new Date(requestParams.from * 1000).toISOString()
                    : 'N/A',
                to: requestParams.to
                    ? new Date(requestParams.to * 1000).toISOString()
                    : 'N/A',
            });
            const config = {
                method: 'get',
                url: `${process.env.RAZORPAY_URL}/v1/orders`,
                headers: { 'Content-Type': 'application/json' },
                auth: { username: authId, password: authSecret },
                params: requestParams,
            };
            const response = await axios_1.default.request(config);
            console.log(`[RESPONSE] Razorpay API status: ${response.status}`);
            return response.data;
        }
        catch (err) {
            console.error('[REQUEST ERROR] Razorpay API failure:', {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
            });
            throw new common_1.InternalServerErrorException(`Page request failed: ${err.message}`);
        }
    }
    async getTransactionForSettlements(utr, razorpay_id, razropay_secret, token, cursor, fromDate, limit, skip) {
        try {
            const date = new Date(fromDate);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date provided');
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate() + 1).padStart(2, '0');
            console.log(year, month, day, 'check');
            const config = {
                method: 'get',
                url: `https://api.razorpay.com/v1/settlements/recon/combined?year=${year}&month=${month}&day=${day}&count=${limit}&skip=${skip}`,
                headers: {
                    'Content-Type': 'application/json',
                },
                auth: {
                    username: razorpay_id,
                    password: razropay_secret,
                },
            };
            try {
                const response = await axios_1.default.request(config);
                const settlements = response.data.items;
                if (settlements.length === 0) {
                    throw new common_1.BadGatewayException('no settlement Found');
                }
                const filteredItems = settlements.filter((item) => item.settlement_utr === utr);
                const orderIds = filteredItems
                    .filter((order) => order.order_receipt !== null)
                    .map((order) => order.order_receipt);
                const objectIdOrderIds = orderIds
                    .map((id) => {
                    try {
                        return new mongoose_1.default.Types.ObjectId(id);
                    }
                    catch (e) {
                        return null;
                    }
                })
                    .filter((id) => id !== null);
                const customOrders = await this.databaseService.CollectRequestModel.find({
                    $or: [
                        { custom_order_id: { $in: orderIds } },
                        { _id: { $in: objectIdOrderIds } },
                    ],
                });
                const customOrderMap = new Map(customOrders.map((doc) => [
                    doc._id.toString(),
                    {
                        _id: doc._id.toString(),
                        custom_order_id: doc.custom_order_id,
                        school_id: doc.school_id,
                        additional_data: doc.additional_data,
                    },
                ]));
                const enrichedOrders = await Promise.all(response.data.items
                    .filter((order) => order.order_receipt)
                    .map(async (order) => {
                    let customData = {};
                    let additionalData = {};
                    let custom_order_id = null;
                    let order_amount = null;
                    let event_amount = null;
                    let event_time = null;
                    let event_success = null;
                    let payment_group = null;
                    let school_id = null;
                    let studentDetails = {};
                    if (order.order_receipt) {
                        console.log(order.order_receipt, "order.order_receipt");
                        customData = customOrderMap.get(order.order_receipt) || {};
                        console.log(customData, "customData");
                        try {
                            custom_order_id = order.order_receipt;
                            school_id = customData.school_id || null;
                            if (typeof customData?.additional_data === 'string') {
                                additionalData = JSON.parse(customData.additional_data);
                            }
                            else {
                                additionalData = customData.additional_data || {};
                            }
                            order_amount = (order.amount / 100).toString();
                            event_amount = (order.amount / 100).toString();
                            event_success = order.settled === true ? 'SUCCESS' : 'FAIL';
                            event_time = order.created_at
                                ? new Date(order.created_at * 1000).toISOString()
                                : null;
                            payment_group = order.method;
                            studentDetails = additionalData?.student_details || {};
                            order.order_id = customData._id || null;
                        }
                        catch {
                            additionalData = null;
                            custom_order_id = null;
                            school_id = null;
                            order_amount = null;
                            event_amount = null;
                            event_time = null;
                            payment_group = null;
                        }
                    }
                    if (order.payment_group &&
                        order.payment_group === 'VBA_TRANSFER') {
                        const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                            cf_payment_id: order.cf_payment_id,
                        });
                        if (requestStatus) {
                            const req = await this.databaseService.CollectRequestModel.findById(requestStatus.collect_id);
                            if (req) {
                                try {
                                    custom_order_id = req.custom_order_id || null;
                                    order.order_id = req._id;
                                    school_id = req.school_id;
                                    if (typeof customData?.additional_data === 'string') {
                                        additionalData = JSON.parse(customData.additional_data);
                                    }
                                    else {
                                        additionalData = customData.additional_data || {};
                                    }
                                    event_success =
                                        order.settled === true ? 'SUCCESS' : 'FAIL';
                                    order_amount = (order.amount / 100).toString();
                                    event_amount = (order.amount / 100).toString();
                                    event_time = order.created_at
                                        ? new Date(order.created_at * 1000).toISOString()
                                        : null;
                                    payment_group = order.method;
                                    studentDetails = additionalData?.student_details || {};
                                }
                                catch {
                                    additionalData = null;
                                    custom_order_id = null;
                                    school_id = null;
                                    order_amount = null;
                                    event_amount = null;
                                    event_time = null;
                                    payment_group = null;
                                }
                            }
                        }
                    }
                    else {
                        if (order.order_id) {
                            event_success = order.settled === true ? 'SUCCESS' : 'FAIL';
                            customData = customOrderMap.get(order.order_id) || {};
                            order_amount = (order.amount / 100).toString();
                            event_amount = (order.amount / 100).toString();
                            event_time = order.created_at
                                ? new Date(order.created_at * 1000).toISOString()
                                : null;
                            payment_group = order.method;
                            try {
                                if (typeof customData?.additional_data === 'string') {
                                    additionalData = JSON.parse(customData.additional_data);
                                }
                                else {
                                    additionalData = customData.additional_data || {};
                                }
                            }
                            catch {
                                additionalData = null;
                                order_amount = null;
                                event_amount = null;
                                event_time = null;
                                payment_group = null;
                            }
                        }
                    }
                    return {
                        ...order,
                        custom_order_id: custom_order_id || null,
                        school_id: school_id || null,
                        student_id: studentDetails?.student_id || null,
                        student_name: studentDetails?.student_name || null,
                        student_email: studentDetails?.student_email || null,
                        student_phone_no: studentDetails?.student_phone_no || null,
                        order_amount: order.amount / 100 || null,
                        event_amount: order.amount / 100 || null,
                        payment_group: order.method || null,
                        event_status: event_success,
                        event_settlement_amount: order.amount / 100 || null,
                        event_time: order.created_at
                            ? new Date(order.created_at * 1000).toISOString()
                            : null,
                    };
                }));
                return {
                    cursor: response.data.cursor || 'N/A',
                    limit: limit,
                    settlements_transactions: enrichedOrders,
                };
            }
            catch (error) {
                throw new common_1.BadRequestException(error.message);
            }
        }
        catch (e) {
            console.log('Error in settlement cron job:', e.message);
            return false;
        }
    }
    async updateOrder(collect_id) {
        try {
            const [collect_request, collect_req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!collect_request || !collect_req_status) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (collect_req_status.status !== 'PENDING') {
                return true;
            }
            const status = await this.getPaymentStatus(collect_request.razorpay.order_id.toString(), collect_request);
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
            return true;
        }
        catch (error) {
            console.log(error);
        }
    }
};
exports.RazorpayNonseamlessService = RazorpayNonseamlessService;
exports.RazorpayNonseamlessService = RazorpayNonseamlessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        edviron_pg_service_1.EdvironPgService])
], RazorpayNonseamlessService);
//# sourceMappingURL=razorpay-nonseamless.service.js.map