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
                        account: v.account || v.vendor_id,
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
};
exports.RazorpayNonseamlessService = RazorpayNonseamlessService;
exports.RazorpayNonseamlessService = RazorpayNonseamlessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], RazorpayNonseamlessService);
//# sourceMappingURL=razorpay-nonseamless.service.js.map