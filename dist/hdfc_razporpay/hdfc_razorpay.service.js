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
exports.HdfcRazorpayService = exports.formatRazorpayPaymentStatus = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const crypto = require("crypto");
const axios_1 = require("axios");
const transactionStatus_1 = require("../types/transactionStatus");
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
let HdfcRazorpayService = class HdfcRazorpayService {
    constructor(databaseService) {
        this.databaseService = databaseService;
        this.API_URL = process.env.RAZORPAY_URL;
    }
    async verifySignature(orderId, paymentId, signature, secret) {
        const body = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret ?? '')
            .update(body)
            .digest('hex');
        return expectedSignature === signature;
    }
    async createOrder(request) {
        try {
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${this.API_URL}/orders`,
                auth: {
                    username: request.hdfc_razorpay_id ?? '',
                    password: request.hdfc_razorpay_secret ?? '',
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': request.hdfc_razorpay_mid ?? '',
                },
                data: {
                    amount: request.amount * 100,
                    currency: 'INR',
                    receipt: request._id,
                },
            };
            const { data } = await axios_1.default.request(config);
            return data;
        }
        catch (error) {
            console.log(error);
            throw new common_1.BadRequestException(error.message || 'Something went wrong');
        }
    }
    async checkPaymentStatus(paymentId, collectRequest) {
        const rzp_payment_id = await this.databaseService.CollectRequestModel.findById(paymentId);
        try {
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${this.API_URL}/payments/${rzp_payment_id?.hdfc_razorpay_payment_id}`,
                auth: {
                    username: collectRequest.hdfc_razorpay_id ?? '',
                    password: collectRequest.hdfc_razorpay_secret ?? '',
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': collectRequest.hdfc_razorpay_mid,
                },
            };
            const { data: paymentStatus } = await axios_1.default.request(config);
            const formattedStatus = await this.formatRazorpayPaymentStatusResponse(paymentStatus, collectRequest);
            console.log(formattedStatus, "format");
            return formattedStatus;
        }
        catch (error) {
            console.log(error.message);
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
    async checkOrderStatus(collectId, collectRequest) {
        try {
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${this.API_URL}/orders?receipt=${collectId}`,
                auth: {
                    username: collectRequest.hdfc_razorpay_id ?? '',
                    password: collectRequest.hdfc_razorpay_secret ?? '',
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': collectRequest.hdfc_razorpay_mid ?? '',
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
    async formatRazorpayPaymentStatusResponse(response, collectRequest) {
        try {
            const collectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectRequest._id,
            });
            if (!collectRequestStatus) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            console.log(response, "resp");
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
            console.log(formattedResponse, "formattedResponse");
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
                url: `${this.API_URL}/payments/${payment_id}/card`,
                auth: {
                    username: collectRequest.hdfc_razorpay_id ?? '',
                    password: collectRequest.hdfc_razorpay_secret ?? '',
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Razorpay-Account': collectRequest.hdfc_razorpay_mid,
                },
            };
            const { data } = await axios_1.default.request(config);
            return data;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response?.data || error.message);
        }
    }
};
exports.HdfcRazorpayService = HdfcRazorpayService;
exports.HdfcRazorpayService = HdfcRazorpayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], HdfcRazorpayService);
//# sourceMappingURL=hdfc_razorpay.service.js.map