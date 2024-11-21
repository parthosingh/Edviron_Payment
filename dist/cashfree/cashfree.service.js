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
let CashfreeService = class CashfreeService {
    constructor(databaseService, edvironPgService) {
        this.databaseService = databaseService;
        this.edvironPgService = edvironPgService;
    }
    async initiateRefund(refund_id, amount, collect_id) {
        const request = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!request) {
            throw new Error('Collect Request not found');
        }
        console.log('initiating refund with cashfree');
        const axios = require('axios');
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
            console.log(response.data);
            return response.data;
        }
        catch (e) {
            console.log(e);
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
};
exports.CashfreeService = CashfreeService;
exports.CashfreeService = CashfreeService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => edviron_pg_service_1.EdvironPgService))),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        edviron_pg_service_1.EdvironPgService])
], CashfreeService);
//# sourceMappingURL=cashfree.service.js.map