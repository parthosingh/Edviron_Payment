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
exports.CheckStatusService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const hdfc_service_1 = require("../hdfc/hdfc.service");
const phonepe_service_1 = require("../phonepe/phonepe.service");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const ccavenue_service_1 = require("../ccavenue/ccavenue.service");
const transactionStatus_1 = require("../types/transactionStatus");
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const moment = require("moment-timezone");
const cashfree_service_1 = require("../cashfree/cashfree.service");
const pay_u_service_1 = require("../pay-u/pay-u.service");
const hdfc_razorpay_service_1 = require("../hdfc_razporpay/hdfc_razorpay.service");
const smartgateway_service_1 = require("../smartgateway/smartgateway.service");
const nttdata_service_1 = require("../nttdata/nttdata.service");
const pos_paytm_service_1 = require("../pos-paytm/pos-paytm.service");
const worldline_service_1 = require("../worldline/worldline.service");
const razorpay_nonseamless_service_1 = require("../razorpay-nonseamless/razorpay-nonseamless.service");
const gatepay_service_1 = require("../gatepay/gatepay.service");
let CheckStatusService = class CheckStatusService {
    constructor(databaseService, hdfcService, phonePeService, edvironPgService, ccavenueService, easebuzzService, cashfreeService, payUService, hdfcRazorpay, hdfcSmartgatewayService, nttdataService, posPaytmService, worldlineService, razorpayServiceModel, gatepayService) {
        this.databaseService = databaseService;
        this.hdfcService = hdfcService;
        this.phonePeService = phonePeService;
        this.edvironPgService = edvironPgService;
        this.ccavenueService = ccavenueService;
        this.easebuzzService = easebuzzService;
        this.cashfreeService = cashfreeService;
        this.payUService = payUService;
        this.hdfcRazorpay = hdfcRazorpay;
        this.hdfcSmartgatewayService = hdfcSmartgatewayService;
        this.nttdataService = nttdataService;
        this.posPaytmService = posPaytmService;
        this.worldlineService = worldlineService;
        this.razorpayServiceModel = razorpayServiceModel;
        this.gatepayService = gatepayService;
    }
    async checkStatus(collect_request_id) {
        console.log('checking status for', collect_request_id);
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        if (!collectRequest) {
            console.log('Collect request not found', collect_request_id);
            throw new common_1.NotFoundException('Collect request not found');
        }
        const custom_order_id = collectRequest.custom_order_id || null;
        const collect_req_status = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectRequest._id,
        });
        if (!collect_req_status) {
            console.log('Collect request status not found', collect_request_id);
            throw new common_1.NotFoundException('Collect request status not found');
        }
        if (collect_req_status.isAutoRefund) {
            const time = collect_req_status.payment_time || collect_req_status.updatedAt;
            const transaction_time = time.toISOString();
            const date = new Date(transaction_time);
            const uptDate = moment(date);
            const istDate = uptDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
            return {
                status: transactionStatus_1.TransactionStatus.FAILURE,
                amount: collect_req_status.order_amount,
                transaction_amount: collect_req_status.transaction_amount ||
                    collect_req_status.order_amount,
                status_code: 400,
                details: {
                    payment_mode: collect_req_status.payment_method,
                    bank_ref: collect_req_status?.bank_reference &&
                        collect_req_status?.bank_reference,
                    payment_methods: collect_req_status?.details &&
                        JSON.parse(collect_req_status.details),
                    transaction_time: collect_req_status.payment_time.toISOString(),
                    formattedTransactionDate: istDate,
                    order_status: transactionStatus_1.TransactionStatus.FAILURE,
                    isSettlementComplete: null,
                    transfer_utr: null,
                    service_charge: null,
                },
                custom_order_id,
            };
        }
        if (collectRequest.isVBAPaymentComplete) {
            let status_code = '400';
            if (collect_req_status.status.toUpperCase() === 'SUCCESS') {
                status_code = '200';
            }
            const details = {
                payment_mode: 'vba',
                bank_ref: collect_req_status.bank_reference || null,
                payment_methods: {
                    vba: {
                        channel: null,
                        vba_account: collectRequest.vba_account_number || null,
                    },
                },
                transaction_time: collect_req_status.payment_time,
                formattedTransactionDate: `${collect_req_status.payment_time.getFullYear()}-${String(collect_req_status.payment_time.getMonth() + 1).padStart(2, '0')}-${String(collect_req_status.payment_time.getDate()).padStart(2, '0')}`,
                order_status: 'PAID',
                isSettlementComplete: true,
                transfer_utr: null,
            };
            return {
                status: collect_req_status.status,
                amount: collectRequest.amount,
                transaction_amount: collect_req_status.transaction_amount,
                status_code,
                details: details,
                custom_order_id: collectRequest.custom_order_id || null,
            };
        }
        if (collectRequest.easebuzz_non_partner) {
            switch (collectRequest.gateway) {
                case collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ:
                    return await this.easebuzzService.easebuzzWebhookCheckStatusV2(collect_request_id, collectRequest);
            }
        }
        switch (collectRequest?.gateway) {
            case collect_request_schema_1.Gateway.HDFC:
                return await this.hdfcService.checkStatus(collect_request_id);
            case collect_request_schema_1.Gateway.PHONEPE:
                return await this.phonePeService.checkStatus(collect_request_id);
            case collect_request_schema_1.Gateway.EDVIRON_PG:
                const edvironPgResponse = await this.edvironPgService.checkStatus(collect_request_id, collectRequest);
                return {
                    ...edvironPgResponse,
                    custom_order_id,
                    capture_status: collect_req_status.capture_status || 'PENDING',
                };
            case collect_request_schema_1.Gateway.SMART_GATEWAY:
                const data = await this.hdfcSmartgatewayService.checkStatus(collectRequest._id.toString(), collectRequest);
                return data;
            case collect_request_schema_1.Gateway.EDVIRON_GATEPAY:
                const gatepay_data = await this.gatepayService.getPaymentStatus(collectRequest._id.toString(), collectRequest);
                return gatepay_data;
            case collect_request_schema_1.Gateway.EDVIRON_RAZORPAY:
                const razorpayData = await this.razorpayServiceModel.getPaymentStatus(collectRequest.razorpay.order_id.toString(), collectRequest);
                return razorpayData;
            case collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ:
                const easebuzzStatus = await this.easebuzzService.statusResponse(collect_request_id.toString(), collectRequest);
                let status_code;
                if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
                    status_code = 200;
                }
                else {
                    status_code = 400;
                }
                const date = collect_req_status.payment_time || collect_req_status.updatedAt;
                if (!date) {
                    throw new Error('No date found in the transaction status');
                }
                const ezb_status_response = {
                    status: easebuzzStatus.msg.status.toUpperCase(),
                    status_code,
                    custom_order_id,
                    amount: parseInt(easebuzzStatus.msg.amount),
                    details: {
                        payment_mode: collect_req_status.payment_time,
                        bank_ref: easebuzzStatus.msg.bank_ref_num,
                        payment_method: { mode: easebuzzStatus.msg.mode },
                        transaction_time: collect_req_status?.updatedAt,
                        formattedTransactionDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                        order_status: easebuzzStatus.msg.status,
                    },
                };
                return ezb_status_response;
            case collect_request_schema_1.Gateway.EDVIRON_CCAVENUE:
                if (collectRequest.school_id === '6819e115e79a645e806c0a70') {
                    return await this.ccavenueService.checkStatusProd(collectRequest, collect_request_id.toString());
                }
                const res = await this.ccavenueService.checkStatus(collectRequest, collect_request_id.toString());
                let status_codes;
                if (res.status.toUpperCase() === transactionStatus_1.TransactionStatus.SUCCESS) {
                    status_codes = 200;
                }
                else {
                    status_codes = 400;
                }
                const order_info = JSON.parse(res.decrypt_res);
                const status_response = {
                    status: res.status,
                    status_code: status_codes,
                    custom_order_id,
                    amount: res.amount,
                    details: {
                        transaction_time: res.transaction_time,
                        payment_methods: res.paymentInstrument,
                        order_status: order_info.Order_Status_Result.order_bank_response,
                    },
                };
                return status_response;
            case collect_request_schema_1.Gateway.EDVIRON_PAY_U:
                return await this.payUService.checkStatus(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.EDVIRON_HDFC_RAZORPAY:
                const EDVIRON_HDFC_RAZORPAY = await this.hdfcRazorpay.checkPaymentStatus(collect_request_id.toString(), collectRequest);
                let order_status = '';
                if (EDVIRON_HDFC_RAZORPAY.status.toUpperCase() === 'SUCCESS') {
                    order_status = 'SUCCESS';
                }
                else {
                    order_status = 'PENDING';
                }
                let statusCode;
                if (EDVIRON_HDFC_RAZORPAY.status.toUpperCase() === 'SUCCESS') {
                    statusCode = 200;
                }
                else {
                    statusCode = 400;
                }
                const Updateddate = EDVIRON_HDFC_RAZORPAY.details.transaction_time;
                if (!Updateddate) {
                    throw new Error('No date found in the transaction status');
                }
                const ehr_status_response = {
                    status: order_status.toUpperCase(),
                    statusCode,
                    custom_order_id,
                    amount: parseInt(EDVIRON_HDFC_RAZORPAY?.amount),
                    details: {
                        payment_mode: EDVIRON_HDFC_RAZORPAY?.details?.payment_method,
                        bank_ref: EDVIRON_HDFC_RAZORPAY.details.bank_ref,
                        payment_method: {
                            mode: EDVIRON_HDFC_RAZORPAY?.details?.payment_mode,
                            method: EDVIRON_HDFC_RAZORPAY?.details?.payment_methods,
                        },
                        transaction_time: Updateddate,
                        formattedTransactionDate: `${new Date(Updateddate).getFullYear()}-${String(new Date(Updateddate).getMonth() + 1).padStart(2, '0')}-${String(new Date(Updateddate).getDate()).padStart(2, '0')}`,
                        order_status: EDVIRON_HDFC_RAZORPAY.status,
                    },
                };
                return ehr_status_response;
            case collect_request_schema_1.Gateway.EDVIRON_NTTDATA:
                console.log('checking status for NTTDATA', collect_request_id);
                return await this.nttdataService.getTransactionStatus(collect_request_id.toString());
            case collect_request_schema_1.Gateway.EDVIRON_WORLDLINE:
                console.log('checking status for EDVIRON_WORLDLINE', collect_request_id);
                return await this.worldlineService.getStatus(collect_request_id.toString());
            case collect_request_schema_1.Gateway.PENDING:
                return await this.checkExpiry(collectRequest);
            case collect_request_schema_1.Gateway.PAYTM_POS:
                return await this.posPaytmService.formattedStatu(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.EXPIRED:
                return {
                    status: collect_req_status_schema_1.PaymentStatus.USER_DROPPED,
                    custom_order_id,
                    amount: collectRequest.amount,
                    status_code: 202,
                };
        }
    }
    async checkStatusByOrderId(order_id, school_id) {
        console.log('checking status for custom order id', order_id);
        const collectRequest = await this.databaseService.CollectRequestModel.findOne({
            custom_order_id: order_id,
            school_id,
        });
        if (!collectRequest) {
            console.log('Collect request not found', order_id);
            throw new common_1.NotFoundException('Collect request not found');
        }
        const collect_req_status = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectRequest._id,
        });
        if (!collect_req_status) {
            console.log('No status found for custom order id', order_id);
            throw new common_1.NotFoundException('No status found for custom order id');
        }
        const collectidString = collectRequest._id.toString();
        if (collectRequest.isVBAPaymentComplete) {
            let status_code = '400';
            if (collect_req_status.status.toUpperCase() === 'SUCCESS') {
                status_code = '200';
            }
            const details = {
                payment_mode: 'vba',
                bank_ref: collect_req_status.bank_reference || null,
                payment_methods: {
                    vba: {
                        channel: null,
                        vba_account: collectRequest.vba_account_number || null,
                    },
                },
                transaction_time: collect_req_status.payment_message,
                formattedTransactionDate: `${collect_req_status.payment_time.getFullYear()}-${String(collect_req_status.payment_time.getMonth() + 1).padStart(2, '0')}-${String(collect_req_status.payment_time.getDate()).padStart(2, '0')}`,
                order_status: 'PAID',
                isSettlementComplete: true,
                transfer_utr: null,
            };
            return {
                status: collect_req_status.status,
                amount: collectRequest.amount,
                transaction_amount: collect_req_status.transaction_amount,
                status_code,
                details: details,
                custom_order_id: collectRequest.custom_order_id || null,
            };
        }
        if (collectRequest.easebuzz_non_partner) {
            switch (collectRequest.gateway) {
                case collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ:
                    return await this.easebuzzService.easebuzzWebhookCheckStatusV2(collectRequest._id.toString(), collectRequest);
            }
        }
        switch (collectRequest?.gateway) {
            case collect_request_schema_1.Gateway.HDFC:
                return await this.hdfcService.checkStatus(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.PHONEPE:
                return await this.phonePeService.checkStatus(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.EDVIRON_PG:
                const edv_response = await this.edvironPgService.checkStatus(collectRequest._id.toString(), collectRequest);
                return {
                    ...edv_response,
                    edviron_order_id: collectRequest._id.toString(),
                };
            case collect_request_schema_1.Gateway.EDVIRON_RAZORPAY:
                const razorpayData = await this.razorpayServiceModel.getPaymentStatus(collectRequest.razorpay.order_id.toString(), collectRequest);
                return razorpayData;
            case collect_request_schema_1.Gateway.SMART_GATEWAY:
                const data = await this.hdfcSmartgatewayService.checkStatus(collectRequest._id.toString(), collectRequest);
                return data;
            case collect_request_schema_1.Gateway.EDVIRON_GATEPAY:
                const gatepay_data = await this.gatepayService.getPaymentStatus(collectRequest._id.toString(), collectRequest);
                return gatepay_data;
            case collect_request_schema_1.Gateway.EDVIRON_WORLDLINE:
                console.log('checking status for EDVIRON_WORLDLINE', collectRequest._id.toString());
                return await this.worldlineService.getStatus(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ:
                const easebuzzStatus = await this.easebuzzService.statusResponse(collectidString, collectRequest);
                let status_code;
                if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
                    status_code = 200;
                }
                else {
                    status_code = 400;
                }
                const date = collect_req_status.updatedAt;
                if (!date) {
                    throw new Error('No date found in the transaction status');
                }
                const ezb_status_response = {
                    status: easebuzzStatus.msg.status.toUpperCase(),
                    status_code,
                    edviron_order_id: collectRequest._id.toString(),
                    amount: parseInt(easebuzzStatus.msg.amount),
                    details: {
                        bank_ref: easebuzzStatus.msg.bank_ref_num,
                        payment_method: { mode: easebuzzStatus.msg.mode },
                        transaction_time: collect_req_status?.updatedAt,
                        formattedTransactionDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                        order_status: easebuzzStatus.msg.status,
                    },
                };
                return ezb_status_response;
            case collect_request_schema_1.Gateway.PAYTM_POS:
                return await this.posPaytmService.formattedStatu(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.EDVIRON_CCAVENUE:
                if (collectRequest.school_id === '6819e115e79a645e806c0a70') {
                    return await this.ccavenueService.checkStatusProd(collectRequest, collectidString);
                }
                const res = await this.ccavenueService.checkStatus(collectRequest, collectidString);
                const order_info = JSON.parse(res.decrypt_res);
                let status_codes;
                if (res.status.toUpperCase() === transactionStatus_1.TransactionStatus.SUCCESS) {
                    status_codes = 200;
                }
                else {
                    status_codes = 400;
                }
                const status_response = {
                    status: res.status,
                    edviron_order_id: collectRequest._id.toString(),
                    status_code: status_codes,
                    amount: res.amount,
                    details: {
                        transaction_time: res.transaction_time,
                        payment_methods: res.paymentInstrument,
                        order_status: order_info.Order_Status_Result.order_bank_response,
                    },
                };
                return status_response;
            case collect_request_schema_1.Gateway.EDVIRON_PAY_U:
                return await this.payUService.checkStatus(collectRequest._id.toString());
            case collect_request_schema_1.Gateway.EDVIRON_NTTDATA:
                return await this.nttdataService.getTransactionStatus(collectRequest.toString());
            case collect_request_schema_1.Gateway.PENDING:
                return await this.checkExpiry(collectRequest);
            case collect_request_schema_1.Gateway.EXPIRED:
                return {
                    status: collect_req_status_schema_1.PaymentStatus.USER_DROPPED,
                    edviron_order_id: collectRequest._id.toString(),
                    amount: collectRequest.amount,
                    status_code: 202,
                };
        }
    }
    async checkExpiry(request) {
        const createdAt = request.createdAt;
        const currentTime = new Date();
        if (!createdAt) {
            return 'Invalid request';
        }
        const timeDifference = currentTime.getTime() - createdAt.getTime();
        const differenceInMinutes = timeDifference / (1000 * 60);
        const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: request._id,
        });
        let paymentStatus = collect_req_status_schema_1.PaymentStatus.USER_DROPPED;
        if (requestStatus) {
            paymentStatus = requestStatus.status;
        }
        if (differenceInMinutes > 25) {
            return {
                status: paymentStatus,
                custom_order_id: request.custom_order_id || 'NA',
                amount: request.amount,
                status_code: 202,
            };
        }
        else {
            return {
                status: 'NOT INITIATED',
                custom_order_id: request.custom_order_id || 'NA',
                amount: request.amount,
                status_code: 202,
            };
        }
    }
    async checkStatusV2(collect_request_id) {
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        if (!collectRequest) {
            throw new common_1.NotFoundException('Collect request not found');
        }
        const custom_order_id = collectRequest.custom_order_id || null;
        const collect_req_status = await this.databaseService.CollectRequestStatusModel.findOne({
            collect_id: collectRequest._id,
        });
        if (!collect_req_status) {
            throw new common_1.NotFoundException('Collect request status not found');
        }
        if (collect_req_status.isAutoRefund) {
            const time = collect_req_status.payment_time || collect_req_status.updatedAt;
            const transaction_time = time.toISOString();
            const date = new Date(transaction_time);
            const uptDate = moment(date);
            const istDate = uptDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
            return {
                status: transactionStatus_1.TransactionStatus.FAILURE,
                amount: collect_req_status.order_amount,
                transaction_amount: collect_req_status.transaction_amount ||
                    collect_req_status.order_amount,
                status_code: 400,
                details: {
                    payment_mode: collect_req_status.payment_method,
                    bank_ref: collect_req_status?.bank_reference &&
                        collect_req_status?.bank_reference,
                    payment_methods: collect_req_status?.details &&
                        JSON.parse(collect_req_status.details),
                    transaction_time: collect_req_status.payment_time.toISOString(),
                    formattedTransactionDate: istDate,
                    order_status: transactionStatus_1.TransactionStatus.FAILURE,
                    isSettlementComplete: null,
                    transfer_utr: null,
                    service_charge: null,
                },
                custom_order_id,
            };
        }
        switch (collectRequest?.gateway) {
            case collect_request_schema_1.Gateway.HDFC:
                return await this.hdfcService.checkStatus(collect_request_id);
            case collect_request_schema_1.Gateway.PHONEPE:
                return await this.phonePeService.checkStatus(collect_request_id);
            case collect_request_schema_1.Gateway.EDVIRON_PG:
                const edvironPgResponse = await this.edvironPgService.checkStatus(collect_request_id, collectRequest);
                return {
                    ...edvironPgResponse,
                    custom_order_id,
                    capture_status: collect_req_status.capture_status || 'PENDING',
                };
            case collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ:
                const easebuzzStatus = await this.easebuzzService.statusResponse(collect_request_id.toString(), collectRequest);
                let status_code;
                if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
                    status_code = 200;
                }
                else {
                    status_code = 400;
                }
                const date = collect_req_status.updatedAt;
                if (!date) {
                    throw new Error('No date found in the transaction status');
                }
                const ezb_status_response = {
                    status: easebuzzStatus.msg.status.toUpperCase(),
                    status_code,
                    custom_order_id,
                    amount: parseInt(easebuzzStatus.msg.amount),
                    details: {
                        payment_mode: collect_req_status.payment_method,
                        bank_ref: easebuzzStatus.msg.bank_ref_num,
                        payment_method: { mode: easebuzzStatus.msg.mode },
                        transaction_time: collect_req_status?.updatedAt,
                        formattedTransactionDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                        order_status: easebuzzStatus.msg.status,
                    },
                };
                return ezb_status_response;
            case collect_request_schema_1.Gateway.EDVIRON_CCAVENUE:
                const res = await this.ccavenueService.checkStatus(collectRequest, collect_request_id.toString());
                let status_codes;
                if (res.status.toUpperCase() === transactionStatus_1.TransactionStatus.SUCCESS) {
                    status_codes = 200;
                }
                else {
                    status_codes = 400;
                }
                const order_info = JSON.parse(res.decrypt_res);
                const status_response = {
                    status: res.status,
                    status_code: status_codes,
                    custom_order_id,
                    amount: res.amount,
                    details: {
                        transaction_time: res.transaction_time,
                        payment_methods: res.paymentInstrument,
                        order_status: order_info.Order_Status_Result.order_bank_response,
                    },
                };
                return status_response;
            case collect_request_schema_1.Gateway.PENDING:
                return await this.checkExpiry(collectRequest);
            case collect_request_schema_1.Gateway.EXPIRED:
                return {
                    status: collect_req_status_schema_1.PaymentStatus.USER_DROPPED,
                    custom_order_id,
                    amount: collectRequest.amount,
                    status_code: 202,
                };
        }
    }
};
exports.CheckStatusService = CheckStatusService;
exports.CheckStatusService = CheckStatusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        hdfc_service_1.HdfcService,
        phonepe_service_1.PhonepeService,
        edviron_pg_service_1.EdvironPgService,
        ccavenue_service_1.CcavenueService,
        easebuzz_service_1.EasebuzzService,
        cashfree_service_1.CashfreeService,
        pay_u_service_1.PayUService,
        hdfc_razorpay_service_1.HdfcRazorpayService,
        smartgateway_service_1.SmartgatewayService,
        nttdata_service_1.NttdataService,
        pos_paytm_service_1.PosPaytmService,
        worldline_service_1.WorldlineService,
        razorpay_nonseamless_service_1.RazorpayNonseamlessService,
        gatepay_service_1.GatepayService])
], CheckStatusService);
//# sourceMappingURL=check-status.service.js.map