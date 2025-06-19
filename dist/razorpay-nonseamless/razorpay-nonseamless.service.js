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
const database_service_1 = require("../database/database.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const hdfc_razorpay_service_1 = require("../hdfc_razporpay/hdfc_razorpay.service");
const transactionStatus_1 = require("../types/transactionStatus");
let RazorpayNonseamlessService = class RazorpayNonseamlessService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async createOrder(collectRequest) {
        try {
            const { _id, amount: totalRupees, razorpay, razorpay_vendors_info, } = collectRequest;
            const totalPaise = Math.round(totalRupees * 100);
            const data = {
                amount: totalPaise,
                currency: 'INR',
                receipt: _id.toString(),
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
    async getPaymentStatus(order_id, collectRequest) {
        try {
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
            const status = orderStatus?.items[0];
            return await this.formatRazorpayPaymentStatusResponse(status, collectRequest);
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
                amount: response?.amount ? response?.amount / 100 : null,
                transaction_amount: response?.amount ? response?.amount / 100 : null,
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
                const cardDetails = await this.fetchCardDetailsOfaPaymentFromRazorpay(response?.id, collectRequest);
                formattedResponse.details.payment_mode = cardDetails?.type;
                formattedResponse.details.payment_methods['card'] = {
                    card_bank_name: cardDetails?.card_issuer || null,
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
    async getTransactionForSettlements(utr, razorpay_id, razropay_secret, token, cursor, fromDate, limit) {
        try {
            const date = new Date(fromDate);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date provided');
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const config = {
                method: 'get',
                url: `https://api.razorpay.com/v1/settlements/recon/combined?year=${year}&month=${month}&day=${day}`,
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
                const customOrders = await this.databaseService.CollectRequestModel.find({
                    custom_order_id: { $in: orderIds },
                });
                const customOrderMap = new Map(customOrders.map((doc) => [
                    doc.custom_order_id,
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
                        customData = customOrderMap.get(order.order_receipt) || {};
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
                            event_success = order.settled === true ? "SUCCESS" : "FAIL";
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
                                    event_success = order.settled === true ? "SUCCESS" : "FAIL";
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
                            event_success = order.settled === true ? "SUCCESS" : "FAIL";
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
                console.log(enrichedOrders, 'enrichedOrders');
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
};
exports.RazorpayNonseamlessService = RazorpayNonseamlessService;
exports.RazorpayNonseamlessService = RazorpayNonseamlessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], RazorpayNonseamlessService);
//# sourceMappingURL=razorpay-nonseamless.service.js.map