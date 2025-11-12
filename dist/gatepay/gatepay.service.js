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
exports.GatepayService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const mongoose_1 = require("mongoose");
const database_service_1 = require("../database/database.service");
const crypto = require('crypto');
let GatepayService = class GatepayService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async encryptEas(data, keyBase64, ivBase64) {
        const key = Buffer.from(keyBase64, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted.toUpperCase();
    }
    async decryptEas(encryptedData, keyBase64, ivBase64) {
        const key = Buffer.from(keyBase64, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async createOrder(request) {
        const { _id, amount, gatepay, additional_data } = request;
        try {
            const { gatepay_mid, gatepay_key, gatepay_iv, gatepay_terminal_id } = gatepay;
            const formatDate = (date) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const months = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                ];
                const pad = (n) => n.toString().padStart(2, '0');
                const day = days[date.getDay()];
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                const hours = pad(date.getHours());
                const minutes = pad(date.getMinutes());
                const seconds = pad(date.getSeconds());
                return `${day} ${month} ${pad(date.getDate())} ${hours}:${minutes}:${seconds} IST ${year}`;
            };
            const formatedDate = formatDate(new Date());
            const data = {
                mid: gatepay_mid,
                amount: amount.toFixed(2).toString(),
                merchantTransactionId: request._id.toString(),
                transactionDate: formatedDate,
                terminalId: gatepay_terminal_id,
                udf1: '',
                udf2: '',
                udf3: '',
                udf4: '',
                udf5: '',
                udf6: '',
                udf7: '',
                udf8: '',
                udf9: '',
                udf10: '',
                ru: `${process.env.URL}/gatepay/callback?collect_id=${_id}`,
                callbackUrl: `${process.env.URL}/gatepay/callback?collect_id=${_id}`,
                currency: 'INR',
                paymentMode: 'ALL',
                bankId: '',
                txnType: 'single',
                productType: 'IPG',
                txnNote: 'Txn',
                vpa: gatepay_terminal_id,
            };
            const ciphertext = await this.encryptEas(JSON.stringify(data), gatepay_key, gatepay_iv);
            const raw = {
                mid: gatepay_mid,
                terminalId: gatepay_terminal_id,
                req: ciphertext,
            };
            const config = {
                url: `${process.env.GET_E_PAY_URL}/getepayPortal/pg/generateInvoice`,
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: raw,
                redirect: `${process.env.URL}/gatepay/callback?collect_id=${_id}`,
            };
            const response = await axios_1.default.request(config);
            if (response.data.status !== 'SUCCESS') {
                throw new common_1.BadRequestException('payment link not created');
            }
            const decrypted = await this.decryptEas(response.data.response, gatepay_key, gatepay_iv);
            const parsedData = JSON.parse(decrypted);
            const { paymentUrl, qrPath, qrIntent, paymentId, token } = parsedData;
            await this.databaseService.CollectRequestModel.findByIdAndUpdate({
                _id,
            }, {
                $set: {
                    'gatepay.token': token,
                    'gatepay.txnId': paymentId,
                    'gatepay.paymentUrl': paymentUrl,
                },
            }, {
                upsert: true,
                new: true,
            });
            const url = `${process.env.URL}/gatepay/redirect?&collect_id=${request._id}`;
            return { url: url, collect_req: request };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getPaymentStatus(collect_id, collect_req) {
        try {
            const [collect_request, collect_req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!collect_request || !collect_req_status) {
                throw new common_1.BadRequestException('Order not found');
            }
            const { gatepay } = collect_request;
            const { gatepay_mid, gatepay_key, gatepay_iv, gatepay_terminal_id, txnId, } = gatepay;
            const data = {
                mid: gatepay_mid,
                paymentId: txnId,
                referenceNo: '',
                status: '',
                terminalId: gatepay_terminal_id,
            };
            const ciphertext = await this.encryptEas(JSON.stringify(data), gatepay_key, gatepay_iv);
            const raw = {
                mid: gatepay_mid,
                terminalId: gatepay_terminal_id,
                req: ciphertext,
            };
            const config = {
                url: `${process.env.GET_E_PAY_URL}/getepayPortal/pg/invoiceStatus`,
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: raw,
            };
            const response = await axios_1.default.request(config);
            const encData = response.data.response;
            const decrypted = await this.decryptEas(encData, gatepay_key, gatepay_iv);
            const parsedData = JSON.parse(decrypted);
            const { txnStatus, txnAmount, txnDate, getepayTxnId } = parsedData;
            let paymentMode = '';
            const payment_method = collect_req_status.payment_method;
            switch (payment_method) {
                case 'debit_card':
                    paymentMode = 'card';
                    break;
                case 'credit_card':
                    paymentMode = 'card';
                    break;
                case 'net_banking':
                    paymentMode = 'net_banking';
                    break;
                case 'upi':
                    paymentMode = 'upi';
                    break;
                default:
                    paymentMode = '';
                    break;
            }
            const transformedResponse = {
                status: txnStatus,
                status_code: response.status,
                custom_order_id: collect_request?.custom_order_id,
                amount: collect_req_status?.order_amount,
                transaction_amount: collect_req_status?.transaction_amount,
                details: {
                    payment_mode: paymentMode,
                    bank_ref: collect_req_status.bank_reference || null,
                    payment_methods: {},
                    transaction_time: collect_req_status.payment_time || null,
                    formattedTransactionDate: collect_req_status.payment_time
                        ? collect_req_status.payment_time.toISOString().split('T')[0]
                        : null,
                    order_status: txnStatus || 'unknown',
                    isSettlementComplete: false,
                    transfer_utr: null,
                    service_charge: 0,
                },
                capture_status: txnStatus,
            };
            if (paymentMode === 'upi') {
                const detail = JSON.parse(collect_req_status.details);
                transformedResponse.details.payment_methods.upi = detail.upi.upi_id;
            }
            if (paymentMode === 'card') {
                const cardDetail = JSON.parse(collect_req_status.details);
                transformedResponse.details.payment_methods.card = {
                    card_bank_name: cardDetail?.card?.card_bank_name || null,
                    card_country: 'IN',
                    card_network: cardDetail?.card?.card_network || null,
                    card_number: cardDetail?.card?.card_number || null,
                    card_sub_type: cardDetail?.card?.card_type === 'credit_card' ? 'P' : 'D',
                    card_type: paymentMode,
                    channel: null,
                };
            }
            if (paymentMode === 'net_banking') {
                const detail = JSON.parse(collect_req_status.details);
                transformedResponse.details.payment_methods.net_banking = {
                    netbanking_bank_name: detail.netbanking.netbanking_bank_name || null,
                };
            }
            if (paymentMode === 'wallet') {
                const detail = JSON.parse(collect_req_status.details);
                transformedResponse.details.payment_methods.wallet = {
                    mode: detail.app.provider,
                };
            }
            return transformedResponse;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getPaymentFromDb(collect_id, collect_req) {
        try {
            const [collect_request, collect_req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!collect_request || !collect_req_status) {
                throw new common_1.BadRequestException('Order not found');
            }
            let paymentMode = '';
            const payment_method = collect_req_status.payment_method;
            switch (payment_method) {
                case 'debit_card':
                    paymentMode = 'card';
                    break;
                case 'credit_card':
                    paymentMode = 'card';
                    break;
                case 'net_banking':
                    paymentMode = 'net_banking';
                    break;
                case 'upi':
                    paymentMode = 'upi';
                    break;
                default:
                    paymentMode = '';
                    break;
            }
            const transformedResponse = {
                status: collect_req_status.status,
                status_code: 200,
                custom_order_id: collect_request?.custom_order_id,
                amount: collect_req_status?.order_amount,
                transaction_amount: collect_req_status?.transaction_amount,
                details: {
                    payment_mode: paymentMode,
                    bank_ref: collect_req_status.bank_reference || null,
                    payment_methods: {},
                    transaction_time: collect_req_status.payment_time || null,
                    formattedTransactionDate: collect_req_status.payment_time
                        ? collect_req_status.payment_time.toISOString().split('T')[0]
                        : null,
                    order_status: collect_req_status.status || 'unknown',
                    isSettlementComplete: false,
                    transfer_utr: null,
                    service_charge: 0,
                },
                capture_status: collect_req_status.status,
            };
            if (paymentMode === 'upi') {
                const detail = JSON.parse(collect_req_status.details);
                transformedResponse.details.payment_methods.upi = detail.upi.upi_id;
            }
            if (paymentMode === 'card') {
                const cardDetail = JSON.parse(collect_req_status.details);
                transformedResponse.details.payment_methods.card = {
                    card_bank_name: cardDetail?.card?.card_bank_name || null,
                    card_country: 'IN',
                    card_network: cardDetail?.card?.card_network || null,
                    card_number: cardDetail?.card?.card_number || null,
                    card_sub_type: cardDetail?.card?.card_type === 'credit_card' ? 'P' : 'D',
                    card_type: paymentMode,
                    channel: null,
                };
            }
            if (paymentMode === 'net_banking') {
                const detail = JSON.parse(collect_req_status.details);
                transformedResponse.details.payment_methods.net_banking = {
                    netbanking_bank_name: detail.netbanking.netbanking_bank_name || null,
                };
            }
            if (paymentMode === 'wallet') {
                const detail = JSON.parse(collect_req_status.details);
                transformedResponse.details.payment_methods.wallet = {
                    mode: detail.app.provider,
                };
            }
            return transformedResponse;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async initiateRefund(collect_id, amount, refund_id) {
        try {
            const collect = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collect)
                throw new common_1.BadRequestException('Collect request not found');
            const { gatepay } = collect;
            const { gatepay_mid, gatepay_key, gatepay_iv, gatepay_terminal_id } = gatepay;
            const transactionId = gatepay.txnId;
            const key = gatepay_key;
            const iv = gatepay_iv;
            const mid = gatepay_mid;
            const terminalId = gatepay_terminal_id;
            const payload = {
                mid,
                transactionId,
                refundRefNo: refund_id,
                terminalId,
                amount,
                description: 'Refund Initiated',
            };
            const encryptedPayload = await this.encryptEas(JSON.stringify(payload), key, iv);
            const config = {
                url: `${process.env.GET_E_PAY_URL}/getepayPortal/pg/refundRequest `,
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    mid,
                    req: encryptedPayload,
                    terminalId
                },
            };
            const response = await axios_1.default.request(config);
            const decrypted = await this.decryptEas(response.data.response, gatepay_key, gatepay_iv);
            const parsedData = JSON.parse(decrypted);
            return {
                collect_id,
                refund_id,
                amount,
                gateway: 'GETEPAY',
                response: parsedData,
            };
        }
        catch (err) {
            console.error('❌ Error initiating refund:', err.message);
            throw new common_1.BadRequestException(err.message);
        }
    }
};
exports.GatepayService = GatepayService;
exports.GatepayService = GatepayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], GatepayService);
//# sourceMappingURL=gatepay.service.js.map