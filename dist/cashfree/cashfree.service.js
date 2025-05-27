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
exports.CashfreeService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const transactionStatus_1 = require("../types/transactionStatus");
const moment = require("moment-timezone");
const jwt = require("jsonwebtoken");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const https = require("https");
const stream = require("stream");
const util_1 = require("util");
const FormData = require("form-data");
const path_1 = require("path");
const mime = require("mime-types");
let CashfreeService = class CashfreeService {
    constructor(databaseService, edvironPgService) {
        this.databaseService = databaseService;
        this.edvironPgService = edvironPgService;
    }
    async initiateRefund(refund_id, amount, collect_id) {
        const axios = require('axios');
        const refundInfoConfig = {
            method: 'get',
            url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-refund-info?refund_id=${refund_id}`,
            headers: {
                'Content-Type': 'application/json',
                accept: 'application/json',
            },
        };
        const res = await axios.request(refundInfoConfig);
        if (res.data.isSplitRedund) {
            try {
                return this.initiateSplitRefund(amount, refund_id, 'inititating refund', collect_id, res.data.split_refund_details);
            }
            catch (e) {
                console.log(e.message);
            }
        }
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new Error('Collect Request not found');
        }
        console.log('initiating refund with cashfree');
        const data = {
            refund_speed: 'STANDARD',
            refund_amount: amount,
            refund_id: refund_id,
        };
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/refunds`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': request.clientId || null,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
            data: data,
        };
        try {
            const response = await axios.request(config);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async initiateSplitRefund(refund_amount, refund_id, refund_note, collect_id, refund_splits) {
        const data = {
            refund_amount: refund_amount,
            refund_id: refund_id,
            refund_note: refund_note,
            refund_splits,
            refund_speed: 'STANDARD',
        };
        try {
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.BadRequestException('Collect Request not found');
            }
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/refunds`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': request.clientId || null,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
                data: data,
            };
            const axios = require('axios');
            const response = await axios.request(config);
            return response.data;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async terminateOrder(collect_id) {
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new Error('Collect Request not found');
        }
        request.gateway = collect_request_schema_1.Gateway.EDVIRON_PG;
        await request.save();
        console.log(`Terminating ${collect_id}`);
        const { status } = await this.checkStatus(collect_id, request);
        if (status.toUpperCase() === 'SUCCESS') {
            throw new Error('Transaction already successful. Cannot terminate.');
        }
        let config = {
            method: 'patch',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': request.clientId,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
            data: { order_status: 'TERMINATED' },
        };
        try {
            const response = await axios_1.default.request(config);
            return response.data;
        }
        catch (e) {
            console.log(e.message);
            throw new common_1.BadRequestException(e.message);
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
        try {
            const { data: cashfreeRes } = await axios.request(config);
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
            let transaction_time = '';
            if (order_status_to_transaction_status_map[cashfreeRes.order_status] === transactionStatus_1.TransactionStatus.SUCCESS) {
                transaction_time = collect_status?.updatedAt?.toISOString();
            }
            const checkStatus = order_status_to_transaction_status_map[cashfreeRes.order_status];
            let status_code;
            if (checkStatus === transactionStatus_1.TransactionStatus.SUCCESS) {
                status_code = 200;
            }
            else {
                status_code = 400;
            }
            const date = new Date(transaction_time);
            const uptDate = moment(date);
            const istDate = uptDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
            return {
                status: order_status_to_transaction_status_map[cashfreeRes.order_status],
                amount: cashfreeRes.order_amount,
                status_code,
                details: {
                    bank_ref: collect_status?.bank_reference && collect_status?.bank_reference,
                    payment_methods: collect_status?.details &&
                        JSON.parse(collect_status.details),
                    transaction_time,
                    formattedTransactionDate: istDate,
                    order_status: cashfreeRes.order_status,
                },
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getTransactionForSettlements(utr, client_id, limit, cursor) {
        try {
            const data = {
                pagination: {
                    limit: limit,
                    cursor,
                },
                filters: {
                    settlement_utrs: [utr],
                },
            };
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.CASHFREE_ENDPOINT}/pg/settlement/recon`,
                headers: {
                    accept: 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': client_id,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
                data,
            };
            const { data: response } = await axios_1.default.request(config);
            const orderIds = response.data
                .filter((order) => order.order_id !== null)
                .map((order) => order.order_id);
            console.log(response, 'response');
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
            const enrichedOrders = response.data
                .map((order) => {
                let customData = {};
                let additionalData = {};
                if (order.order_id) {
                    customData = customOrderMap.get(order.order_id) || {};
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
                cursor: response.cursor,
                limit: response.limit,
                settlements_transactions: enrichedOrders,
            };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getUpiPaymentInfoUrl(collect_id) {
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new common_1.BadRequestException('Collect Request not found');
        }
        await request.save();
        const cashfreeId = request.paymentIds.cashfree_id;
        if (!cashfreeId) {
            throw new common_1.BadRequestException('Error in Getting QR Code');
        }
        let intentData = JSON.stringify({
            payment_method: {
                upi: {
                    channel: 'link',
                },
            },
            payment_session_id: cashfreeId,
        });
        let qrCodeData = JSON.stringify({
            payment_method: {
                upi: {
                    channel: 'qrcode',
                },
            },
            payment_session_id: cashfreeId,
        });
        let upiConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/sessions`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
            },
            data: intentData,
        };
        let qrCodeConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/sessions`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
            },
            data: qrCodeData,
        };
        const axios = require('axios');
        try {
            const { data: upiIntent } = await axios.request(upiConfig);
            const { data: qrCode } = await axios.request(qrCodeConfig);
            const intent = upiIntent.data.payload.default;
            const qrCodeUrl = qrCode.data.payload.qrcode;
            const qrBase64 = qrCodeUrl.split(',')[1];
            request.isQRPayment = true;
            await request.save();
            setTimeout(async () => {
                try {
                    await this.terminateOrder(collect_id);
                    console.log(`Order ${collect_id} terminated after 10 minutes`);
                }
                catch (error) {
                    console.error(`Failed to terminate order ${collect_id}:`, error);
                }
            }, 600000);
            return { intentUrl: intent, qrCodeBase64: qrBase64, collect_id };
        }
        catch (e) {
            console.log(e);
            if (e.response?.data?.message && e.response?.data?.code) {
                if (e.response?.data?.message &&
                    e.response?.data?.code === 'order_inactive') {
                    throw new common_1.BadRequestException('Order expired');
                }
                throw new common_1.BadRequestException(e.response.data.message);
            }
            throw new common_1.BadRequestException(e.message);
        }
    }
    async settlementStatus(collect_id, client_id) {
        try {
            const CollectRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id,
            });
            if (!CollectRequestStatus) {
                throw new common_1.BadRequestException('Settlement status not found');
            }
            const { transaction_amount, order_amount } = CollectRequestStatus;
            const taxes = Number(transaction_amount) - Number(order_amount);
            const config = {
                method: 'get',
                url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/settlements`,
                headers: {
                    accept: 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': client_id,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
            };
            try {
                const response = await (0, axios_1.default)(config);
                const settlement_info = response.data;
                if (settlement_info.transfer_utr) {
                    return {
                        isSettlementComplete: true,
                        transfer_utr: settlement_info.transfer_utr,
                        service_charge: taxes,
                    };
                }
            }
            catch (e) {
                console.log(e.message);
            }
            return {
                isSettlementComplete: false,
                transfer_utr: null,
                service_charge: taxes,
            };
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async initiateCapture(client_id, collect_id, capture, amount) {
        try {
            const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectRequest) {
                throw new common_1.BadRequestException('Collect Request not found');
            }
            const staus = await this.checkStatus(collect_id, collectRequest);
            const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id,
            });
            if (!requestStatus) {
                throw new common_1.BadRequestException('Request status not found');
            }
            await requestStatus.save();
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/authorization`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': client_id,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
                data: {
                    action: capture,
                    amount: requestStatus.transaction_amount,
                },
            };
            const response = await (0, axios_1.default)(config);
            console.log(response.data);
            requestStatus.capture_status = response.data.authorization.action;
            if (response.data.payment_status === 'VOID') {
                requestStatus.status = collect_req_status_schema_1.PaymentStatus.FAILURE;
                await requestStatus.save();
            }
            await requestStatus.save();
            return response.data;
        }
        catch (e) {
            if (e.response?.data.message) {
                throw new common_1.BadRequestException(e.response.data.message);
            }
            throw new common_1.BadRequestException(e.message);
        }
    }
    async vendorSettlementRecon(client_id, start_date, end_date, utrNumber, cursor) {
        try {
            const data = {
                pagination: {
                    limit: 1000,
                    cursor: cursor,
                },
                filters: {
                    settlement_utrs: utrNumber,
                    start_date: new Date(new Date(start_date).setHours(0, 0, 0, 0)).toISOString(),
                    end_date: new Date(new Date(end_date).setHours(23, 59, 59, 999)).toISOString(),
                },
            };
            console.log(data, 'payload');
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.CASHFREE_ENDPOINT}/pg/recon/vendor`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': client_id,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
                data: data,
            };
            const response = await (0, axios_1.default)(config);
            console.log(response.data, 'ooooooo', data);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getPaymentStatus(order_id, client_id) {
        console.log(order_id, client_id);
        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${order_id}/payments`,
            headers: {
                accept: 'application/json',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': client_id,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
        };
        try {
            const { data: response } = await (0, axios_1.default)(config);
            return response.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async submitDisputeEvidence(dispute_id, documents, client_id) {
        const data = {
            dispute_id,
            documents,
        };
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/disputes/${dispute_id}/documents`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'multipart/form-data',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': client_id,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
            data: data,
        };
        try {
            const response = await axios_1.default.request(config);
            return response.data;
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message || 'Something went wrong');
        }
    }
    async acceptDispute(disputeId, client_id) {
        try {
            const config = {
                method: 'put',
                maxBodyLength: Infinity,
                url: `${process.env.CASHFREE_ENDPOINT}/pg/disputes/${disputeId}/accept`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': client_id,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
            };
            const response = await axios_1.default.request(config);
            return response.data;
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message || 'Something went wrong');
        }
    }
    async createMerchant(merchant_id, merchant_email, merchant_name, poc_phone, merchant_site_url, business_details, website_details, bank_account_details, signatory_details) {
        const url = 'https://api.cashfree.com/partners/merchants';
        const headers = {
            'Content-Type': 'application/json',
            'x-partner-apikey': process.env.CASHFREE_API_KEY,
        };
        const data = {
            merchant_id,
            merchant_email,
            merchant_name,
            poc_phone,
            merchant_site_url,
            business_details,
            website_details: {
                ...website_details,
            },
            bank_account_details,
            signatory_details,
        };
        console.log({
            merchant_email,
            poc_phone,
        });
        const config = {
            method: 'post',
            url,
            headers,
            data,
        };
        try {
            const response = await axios_1.default.request(config);
            console.log('Cashfree response:', response.data);
            return response.data;
            return 'Merchant Request Created Successfully on Cashfree';
        }
        catch (error) {
            console.error('Cashfree API error:', error);
            throw new Error('Cashfree API request failed');
        }
    }
    async initiateMerchantOnboarding(school_id, kyc_mail) {
        const kycInfo = await this.getMerchantInfo(school_id, kyc_mail);
        const { merchant_id, merchant_email, merchant_name, poc_phone, merchant_site_url, business_details, website_details, bank_account_details, signatory_details, } = kycInfo;
        console.log(kycInfo, 'kyc info');
        const merchant = await this.createMerchant(merchant_id, merchant_email, merchant_name, poc_phone, merchant_site_url, business_details, website_details, bank_account_details, signatory_details);
        return merchant;
    }
    async uploadKycDocs2(school_id) {
        try {
            const token = jwt.sign({ school_id }, process.env.JWT_SECRET_FOR_INTRANET);
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.MAIN_BACKEND}/api/trustee/get-school-kyc?school_id=${school_id}&token=${token}`,
                headers: {
                    accept: 'application/json',
                },
            };
            const { data: kycresponse } = await axios_1.default.request(config);
            const businessproof_saecertificate = kycresponse.businessProof;
            const pipeline = (0, util_1.promisify)(stream.pipeline);
            const bankProofUrl = kycresponse.bankProof;
            const Businessproof_regproof = kycresponse.entityPan;
            const Businessproof_saecertificate = kycresponse.businessProof;
            if (kycresponse.businessSubCategory === 'Trust') {
                const entityproof_trustdeed = kycresponse.businessProof;
            }
            if (kycresponse.businessSubCategory === 'Society') {
                const Entityproof_societycertificate = kycresponse.businessProof;
            }
            console.log(kycresponse);
            if (!bankProofUrl) {
                throw new common_1.BadRequestException('Bank proof not found');
            }
            const response = await axios_1.default.get(bankProofUrl, {
                responseType: 'stream',
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });
            const filename = await this.extractFilenameFromUrl(bankProofUrl);
            const form = new FormData();
            form.append('document_type', 'bank_statement');
            form.append('file', response.data, {
                filename: filename,
                contentType: response.headers['content-type'],
            });
            const cashfreeResponse = await axios_1.default.post(`https://api.cashfree.com/partners/merchants/${school_id}/documents`, form, {
                headers: {
                    ...form.getHeaders(),
                    'x-partner-apikey': 'hMEYtP5hELxG944df6e6223f41e1fc2100c34cb2fb98321ad408',
                },
                maxBodyLength: Infinity,
            });
            return cashfreeResponse.data;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async uploadKycDocs(school_id) {
        try {
            const token = jwt.sign({ school_id }, process.env.JWT_SECRET_FOR_INTRANET);
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.MAIN_BACKEND}/api/trustee/get-school-kyc?school_id=${school_id}&token=${token}`,
                headers: {
                    accept: 'application/json',
                },
            };
            const { data: kycresponse } = await axios_1.default.request(config);
            const documentsToUpload = [];
            if (kycresponse.bankProof) {
                documentsToUpload.push({
                    url: kycresponse.bankProof,
                    docType: 'bank_statement',
                });
            }
            else {
                throw new common_1.BadRequestException('Bank proof not found');
            }
            if (kycresponse.businessProof) {
                documentsToUpload.push({
                    url: kycresponse.businessProof,
                    docType: 'businessproof_saecertificate',
                });
            }
            if (kycresponse.affiliation) {
                documentsToUpload.push({
                    url: kycresponse.affiliation,
                    docType: 'lobproof_education',
                });
            }
            if (kycresponse.businessSubCategory === 'Trust' &&
                kycresponse.businessProof) {
                documentsToUpload.push({
                    url: kycresponse.businessProof,
                    docType: 'entity_proof_trustdeed',
                });
            }
            if (kycresponse.businessSubCategory === 'Society' &&
                kycresponse.businessProof) {
                documentsToUpload.push({
                    url: kycresponse.businessProof,
                    docType: 'Entityproof_societycertificate',
                });
            }
            const extractFilenameFromUrl = (url) => {
                try {
                    const pathname = new URL(url).pathname;
                    const segments = pathname.split('/');
                    return segments.pop() || 'file';
                }
                catch {
                    return 'file';
                }
            };
            const uploadResults = [];
            for (const doc of documentsToUpload) {
                const response = await axios_1.default.get(doc.url, {
                    responseType: 'stream',
                    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                });
                const filename = extractFilenameFromUrl(doc.url);
                const form = new FormData();
                form.append('document_type', doc.docType);
                form.append('file', response.data, {
                    filename,
                    contentType: response.headers['content-type'],
                });
                try {
                    const cashfreeResponse = await axios_1.default.post(`https://api.cashfree.com/partners/merchants/${school_id}/documents`, form, {
                        headers: {
                            ...form.getHeaders(),
                            'x-partner-apikey': 'hMEYtP5hELxG944df6e6223f41e1fc2100c34cb2fb98321ad408',
                        },
                        maxBodyLength: Infinity,
                    });
                    uploadResults.push({
                        document: doc.docType,
                        response: cashfreeResponse.data,
                    });
                }
                catch (e) {
                    console.log(form);
                    console.log(doc);
                }
            }
            return uploadResults;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getMerchantInfo(school_id, kyc_mail) {
        const token = jwt.sign({ school_id }, process.env.JWT_SECRET_FOR_INTRANET);
        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.MAIN_BACKEND}/api/trustee/get-school-kyc?school_id=${school_id}&token=${token}`,
            headers: {
                accept: 'application/json',
            },
        };
        const { data: response } = await axios_1.default.request(config);
        if (!response.legal_name) {
            throw new common_1.BadRequestException('legalName required');
        }
        if (!response.businessCategory) {
            throw new common_1.BadRequestException('businessCategory is re');
        }
        if (!response.authSignatory?.auth_sighnatory_name_on_aadhar) {
            throw new common_1.BadRequestException('authSignatory?.auth_sighnatory_name_on_aadhar, required');
        }
        const school = await this.edvironPgService.getAllSchoolInfo(school_id);
        console.log(school);
        const details = {
            merchant_id: response.school,
            merchant_email: kyc_mail,
            merchant_name: school.school_name,
            poc_phone: '7000061754',
            merchant_site_url: 'https://www.edviron.com/',
            business_details: {
                business_legal_name: response.legal_name,
                business_type: response.businessCategory,
                business_model: 'Both',
                business_category: response.businessCategory || null,
                business_subcategory: response.businessSubCategory || null,
                business_pan: response.businessProofDetails?.business_pan_number || null,
                business_address: response.businessAddress?.address || null,
                business_city: response.businessAddress?.city || null,
                business_state: response.businessAddress?.state || null,
                business_postalcode: response.businessAddress?.pincode || null,
                business_country: 'INDIA',
                business_gstin: response.gst_no || null,
                business_cin: null,
            },
            website_details: {
                website_contact_us: 'https://www.edviron.com/',
                website_privacy_policy: 'https://www.edviron.com/',
                website_refund_policy: 'https://www.edviron.com/',
                website_tnc: 'https://www.edviron.com/',
            },
            bank_account_details: {
                bank_account_number: response.bankDetails?.account_number || null,
                bank_ifsc: response.bankDetails?.ifsc_code || null,
            },
            signatory_details: {
                signatory_name: response.authSignatory?.auth_sighnatory_name_on_aadhar,
                signatory_pan: response.authSignatory?.auth_sighnatory_pan_number || null,
            },
        };
        return details;
    }
    async getFilenameFromUrlOrContentType(url, contentType) {
        const urlPath = new URL(url).pathname;
        let filename = path_1.default.basename(urlPath);
        if (!filename || !filename.includes('.')) {
            const ext = mime.extension(contentType || '') || 'bin';
            filename = `bankProof.${ext}`;
        }
        return filename;
    }
    async extractFilenameFromUrl(url) {
        try {
            const pathname = new URL(url).pathname;
            const segments = pathname.split('/');
            return segments.pop() || 'file';
        }
        catch {
            return 'file';
        }
    }
};
exports.CashfreeService = CashfreeService;
exports.CashfreeService = CashfreeService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => edviron_pg_service_1.EdvironPgService))),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        edviron_pg_service_1.EdvironPgService])
], CashfreeService);
//# sourceMappingURL=cashfree.service.js.map