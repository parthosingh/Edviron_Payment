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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const cashfree_service_1 = require("../cashfree/cashfree.service");
const database_service_1 = require("../database/database.service");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const axios_1 = require("axios");
const json2csv_1 = require("json2csv");
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const aws_s3_service_service_1 = require("../aws-s3-service/aws-s3-service.service");
let ReportsService = class ReportsService {
    constructor(databaseService, cashfreeService, edvironPgService, awsS3Service) {
        this.databaseService = databaseService;
        this.cashfreeService = cashfreeService;
        this.edvironPgService = edvironPgService;
        this.awsS3Service = awsS3Service;
    }
    async getTransactionForSettlements(utr, client_id, limit, school_name, cursor, school_id) {
        try {
            const data = {
                pagination: { limit, cursor },
                filters: { settlement_utrs: [utr] },
            };
            console.log(data, 'data for settlements transactions');
            const config = {
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
            const rawOrders = response.data.filter((order) => order.order_id && order.event_type !== 'DISPUTE');
            const orderIds = rawOrders.map((order) => order.order_id);
            const cfPaymentIds = rawOrders
                .filter((o) => o.payment_group === 'VBA_TRANSFER' && o.cf_payment_id)
                .map((o) => o.cf_payment_id);
            const [requests, requestStatuses, customOrders] = await Promise.all([
                this.databaseService.CollectRequestModel.find({
                    _id: { $in: orderIds },
                }).lean(),
                this.databaseService.CollectRequestStatusModel.find({
                    $or: [
                        {
                            collect_id: {
                                $in: orderIds.map((id) => new mongoose_1.Types.ObjectId(id)),
                            },
                        },
                        { cf_payment_id: { $in: cfPaymentIds } },
                    ],
                }).lean(),
                this.databaseService.CollectRequestModel.find({
                    _id: { $in: orderIds },
                }).lean(),
            ]);
            const requestMap = new Map(requests.map((r) => [r._id.toString(), r]));
            const statusByCollectId = new Map(requestStatuses
                .filter((s) => s.collect_id)
                .map((s) => [s.collect_id.toString(), s]));
            const statusByCfPaymentId = new Map(requestStatuses
                .filter((s) => s.cf_payment_id)
                .map((s) => [s.cf_payment_id, s]));
            const customOrderMap = new Map(customOrders.map((doc) => [
                doc._id.toString(),
                {
                    custom_order_id: doc.custom_order_id,
                    school_id: doc.school_id,
                    additional_data: doc.additional_data,
                },
            ]));
            const enrichedOrders = rawOrders.map((order) => {
                const request = requestMap.get(order.order_id);
                if (!request)
                    return null;
                let custom_order_id = null;
                let school_id_resolved = request.school_id || null;
                let payment_id = request.payment_id || null;
                let additionalData = {};
                const status = statusByCollectId.get(order.order_id) ||
                    statusByCfPaymentId.get(order.cf_payment_id);
                if (!payment_id) {
                    console.warn(`Missing payment_id for order: ${order.order_id}`);
                }
                const customData = customOrderMap.get(order.order_id);
                if (customData) {
                    custom_order_id = customData.custom_order_id || null;
                    school_id_resolved = customData.school_id || school_id_resolved;
                    try {
                        additionalData = JSON.parse(customData.additional_data || '{}');
                    }
                    catch {
                        additionalData = {};
                    }
                }
                if (order.payment_group === 'VBA_TRANSFER' && status?.collect_id) {
                    const vbaRequest = requestMap.get(status.collect_id.toString());
                    if (vbaRequest) {
                        try {
                            custom_order_id = vbaRequest.custom_order_id || null;
                            school_id_resolved = vbaRequest.school_id || school_id_resolved;
                            additionalData = JSON.parse(vbaRequest.additional_data || '{}');
                        }
                        catch {
                            additionalData = {};
                        }
                    }
                }
                return {
                    school_name: school_name || null,
                    school_id: school_id_resolved,
                    adjustment: order.adjustment || null,
                    transaction_time: status?.payment_time || order.event_time || null,
                    custom_order_id: custom_order_id || null,
                    order_id: order.order_id,
                    payment_id: payment_id,
                    order_amount: request.amount || null,
                    transaction_amount: status?.transaction_amount || null,
                    payment_mode: order.payment_group || status?.payment_method || null,
                    status: status?.status || order.event_status || null,
                    student_id: additionalData?.student_details?.student_id || null,
                    student_name: additionalData?.student_details?.student_name || null,
                    student_email: additionalData?.student_details?.student_email || null,
                    student_phone_no: additionalData?.student_details?.student_phone_no || null,
                    settlement_date: order.settlement_date || null,
                    settlement_utr: order.settlement_utr || null,
                    bank_refrence: status?.bank_reference || null,
                };
            });
            console.timeEnd('enriching orders');
            return {
                cursor: response.cursor,
                limit: response.limit,
                settlements_transactions: enrichedOrders.filter(Boolean),
            };
        }
        catch (e) {
            console.error(e);
            throw new common_1.BadRequestException(e.message || 'Something went wrong while processing settlements');
        }
    }
    async rateLimiting(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async getBulkReport(utrs, report_id) {
        try {
            console.log(utrs, 'utrs');
            const allTransactions = [];
            const maxRequestsPerSecond = 10;
            const delayBetweenRequests = 1000 / maxRequestsPerSecond;
            for (const utr of utrs) {
                let cursor = null;
                do {
                    const result = await this.getTransactionForSettlements(utr.utr, utr.client_id, 1000, utr.school_name, cursor);
                    allTransactions.push(...result.settlements_transactions);
                    cursor = result.cursor || null;
                    await this.rateLimiting(delayBetweenRequests);
                } while (cursor);
            }
            if (!allTransactions.length) {
                throw new common_1.BadRequestException('No transactions found for given UTRs');
            }
            const formatted = allTransactions.map((txn) => ({
                ...txn,
                created_at: txn.created_at
                    ? new Date(txn.created_at).toLocaleString('en-IN')
                    : '',
                processed_at: txn.processed_at
                    ? new Date(txn.processed_at).toLocaleString('en-IN')
                    : '',
                settlement_date: txn.settlement_date
                    ? new Date(txn.settlement_date).toLocaleString('en-IN')
                    : '',
            }));
            const fields = [
                'school_name',
                'school_id',
                'adjustment',
                'transaction_time',
                'custom_order_id',
                'order_id',
                'payment_id',
                'order_amount',
                'transaction_amount',
                'payment_mode',
                'status',
                'student_id',
                'student_name',
                'student_email',
                'student_phone_no',
                'settlement_date',
                'settlement_utr',
                'bank_refrence',
            ];
            const parser = new json2csv_1.Parser({ fields });
            const csv = parser.parse(formatted);
            const buffer = Buffer.from(csv, 'utf-8');
            const fileKey = `reports/utr-transactions-${Date.now()}-${(0, uuid_1.v4)()}.csv`;
            const s3Url = await this.awsS3Service.uploadToS3(buffer, fileKey, 'text/csv', process.env.REPORT_BUCKET || 'edviron-reports');
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.VANILLA_SERVICE}/main-backend/update-report`,
                headers: {
                    accept: 'application/json',
                },
                data: {
                    report_id: report_id,
                    status: 'COMPLETED',
                    url: s3Url,
                },
            };
            await axios_1.default.request(config);
            return { report_url: s3Url, total_transactions: allTransactions.length };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message || 'Failed to generate bulk report');
        }
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        cashfree_service_1.CashfreeService,
        edviron_pg_service_1.EdvironPgService,
        aws_s3_service_service_1.AwsS3ServiceService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map