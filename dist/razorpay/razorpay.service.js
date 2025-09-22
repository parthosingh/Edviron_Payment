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
exports.RazorpayService = exports.formatRazorpayPaymentStatus = void 0;
const common_1 = require("@nestjs/common");
const transactionStatus_1 = require("../types/transactionStatus");
const crypto = require("crypto");
const axios_1 = require("axios");
const database_service_1 = require("../database/database.service");
const formatRazorpayPaymentStatus = (status) => {
    const statusMap = {
        created: transactionStatus_1.TransactionStatus.PENDING,
        authorized: transactionStatus_1.TransactionStatus.PENDING,
        captured: transactionStatus_1.TransactionStatus.SUCCESS,
        failed: transactionStatus_1.TransactionStatus.FAILURE,
    };
    return statusMap[status] ?? transactionStatus_1.TransactionStatus.PENDING;
};
exports.formatRazorpayPaymentStatus = formatRazorpayPaymentStatus;
let RazorpayService = class RazorpayService {
    constructor(databaseService) {
        this.databaseService = databaseService;
        this.CLIENT_ID = process.env.RAZORPAY_PARTNER_KEY_ID;
        this.CLIENT_SECRET = process.env.RAZORPAY_PARTNER_KEY_SECRET;
        this.API_URL = process.env.RAZORPAY_URL;
    }
    async verifySignature(orderId, paymentId, signature) {
        const body = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', this.CLIENT_SECRET ?? '')
            .update(body)
            .digest('hex');
        return expectedSignature === signature;
    }
    async createOrder(collectRequest) {
        try {
            const { _id, amount: totalRupees, razorpay, razorpay_vendors_info, additional_data, } = collectRequest;
            const createOrderConfig = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.RAZORPAY_URL}/v1/orders`,
                auth: {
                    username: collectRequest.razorpay_seamless.razorpay_id,
                    password: collectRequest.razorpay_seamless.razorpay_secret,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
                },
                data: {
                    amount: collectRequest.amount * 100,
                    currency: 'INR',
                    receipt: collectRequest._id.toString(),
                },
            };
            const { data: razorpayRes } = await axios_1.default.request(createOrderConfig);
            await collectRequest.constructor.updateOne({ _id }, {
                $set: {
                    'razorpay_seamless.order_id': razorpayRes.id,
                },
            });
            return razorpayRes;
        }
        catch (error) {
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
    async checkOrderStatus(collectId, collectRequest) {
        try {
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.RAZORPAY_URL}/orders?receipt=${collectId}`,
                auth: {
                    username: collectRequest.razorpay_seamless.razorpay_id,
                    password: collectRequest.razorpay_seamless.razorpay_secret,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
                },
            };
            const { data: orderStatus } = await axios_1.default.request(config);
            const status = orderStatus?.items[0];
            return await this.formatRazorpayPaymentStatusResponse(status, collectRequest);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async checkOrderStatusByRazorpayId(razorpayId, collectRequest) {
        try {
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.RAZORPAY_URL}/orders/${razorpayId}`,
                auth: {
                    username: collectRequest.razorpay_seamless.razorpay_id,
                    password: collectRequest.razorpay_seamless.razorpay_secret,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
                },
            };
            const { data } = await axios_1.default.request(config);
            return await this.formatRazorpayPaymentStatusResponse(data, collectRequest);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async checkPaymentStatus(paymentId, collectRequest) {
        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.RAZORPAY_URL}/payments/${paymentId}`,
            auth: {
                username: collectRequest.razorpay_seamless.razorpay_id,
                password: collectRequest.razorpay_seamless.razorpay_secret,
            },
            headers: {
                'Content-Type': 'application/json',
                'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
            },
        };
        try {
            const { data: paymentStatus } = await axios_1.default.request(config);
            const formattedStatus = await this.formatRazorpayPaymentStatusResponse(paymentStatus, collectRequest);
            return formattedStatus;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
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
            const status = (0, exports.formatRazorpayPaymentStatus)(response?.status);
            const statusCode = status === transactionStatus_1.TransactionStatus.SUCCESS
                ? 200
                : status === transactionStatus_1.TransactionStatus.FAILURE
                    ? 400
                    : 202;
            const formattedResponse = {
                status: status,
                amount: response?.amount ? response?.amount / 100 : null,
                transaction_amount: collectRequestStatus?.transaction_amount,
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
                    username: collectRequest.razorpay_seamless.razorpay_id,
                    password: collectRequest.razorpay_seamless.razorpay_secret,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
                },
            };
            const { data } = await axios_1.default.request(config);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async getDispute(dispute_id, razorpay_mid, collectRequest) {
        try {
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.RAZORPAY_URL}/disputes/${dispute_id}`,
                auth: {
                    username: collectRequest.razorpay_seamless.razorpay_id,
                    password: collectRequest.razorpay_seamless.razorpay_secret,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': razorpay_mid,
                },
            };
            const { data } = await axios_1.default.request(config);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async getQr(collectRequest) {
        try {
            const { order_id } = collectRequest.razorpay_seamless;
            const collect_id = collectRequest._id.toString();
            const createQrConfig = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `https://api.razorpay.com/v1/payments/qr_codes`,
                auth: {
                    username: collectRequest.razorpay_seamless.razorpay_id,
                    password: collectRequest.razorpay_seamless.razorpay_secret,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    type: 'upi_qr',
                    name: 'qr_code',
                    usage: 'single_use',
                    fixed_amount: true,
                    payment_amount: collectRequest.amount * 100,
                    order_id: order_id,
                },
            };
            const { data: razorpayRes } = await axios_1.default.request(createQrConfig);
            console.log(razorpayRes, 'razorpayRes');
            return {
                qr_id: razorpayRes.id,
                status: razorpayRes.status,
                image_url: razorpayRes.image_url,
            };
        }
        catch (error) {
            console.log(error.response?.data || error.message, 'error');
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
};
exports.RazorpayService = RazorpayService;
exports.RazorpayService = RazorpayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], RazorpayService);
//# sourceMappingURL=razorpay.service.js.map