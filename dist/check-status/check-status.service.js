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
let CheckStatusService = class CheckStatusService {
    constructor(databaseService, hdfcService, phonePeService, edvironPgService, ccavenueService, easebuzzService) {
        this.databaseService = databaseService;
        this.hdfcService = hdfcService;
        this.phonePeService = phonePeService;
        this.edvironPgService = edvironPgService;
        this.ccavenueService = ccavenueService;
        this.easebuzzService = easebuzzService;
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
                const ezb_status_response = {
                    status: easebuzzStatus.msg.status.toUpperCase(),
                    status_code,
                    custom_order_id,
                    amount: parseInt(easebuzzStatus.msg.amount),
                    details: {
                        bank_ref: easebuzzStatus.msg.bank_ref_num,
                        payment_method: { mode: easebuzzStatus.msg.mode },
                        transaction_time: collect_req_status?.updatedAt,
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
                return {
                    status: 'NOT INITIATED',
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
        const collectidString = collectRequest._id.toString();
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
            case collect_request_schema_1.Gateway.EDVIRON_EASEBUZZ:
                const easebuzzStatus = await this.easebuzzService.statusResponse(collectidString, collectRequest);
                let status_code;
                if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
                    status_code = 200;
                }
                else {
                    status_code = 400;
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
                        order_status: easebuzzStatus.msg.status,
                    },
                };
                return ezb_status_response;
            case collect_request_schema_1.Gateway.EDVIRON_CCAVENUE:
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
            case collect_request_schema_1.Gateway.PENDING:
                return {
                    status: 'NOT INITIATED',
                    amount: collectRequest.amount,
                    edviron_order_id: collectRequest._id.toString(),
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
        easebuzz_service_1.EasebuzzService])
], CheckStatusService);
//# sourceMappingURL=check-status.service.js.map