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
let ReportsService = class ReportsService {
    constructor(databaseService, cashfreeService, edvironPgService) {
        this.databaseService = databaseService;
        this.cashfreeService = cashfreeService;
        this.edvironPgService = edvironPgService;
    }
    async getTransactionForSettlements(utr, client_id, limit, school_name, cursor) {
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
            let custom_order_id = null;
            let school_id = null;
            let payment_id = null;
            const enrichedOrders = await Promise.all(response.data
                .filter((order) => order.order_id && order.event_type !== 'DISPUTE')
                .map(async (order) => {
                let customData = {};
                let additionalData = {};
                const request = await this.databaseService.CollectRequestModel.findById(order.order_id);
                if (!request) {
                    console.log('order not found');
                    throw new common_1.BadRequestException('order not found');
                }
                if (request.payment_id === null ||
                    request.payment_id === '' ||
                    request.payment_id === undefined) {
                    const cf_payment_id = await this.edvironPgService.getPaymentId(order.order_id, request);
                    request.payment_id = cf_payment_id;
                    payment_id = cf_payment_id;
                    await request.save();
                }
                else {
                    console.log(request.payment_id);
                    payment_id = request.payment_id;
                }
                if (order.order_id) {
                    customData = customOrderMap.get(order.order_id) || {};
                    try {
                        custom_order_id = customData.custom_order_id || null;
                        (school_id = customData.school_id || null),
                            (additionalData = JSON.parse(customData?.additional_data));
                    }
                    catch {
                        additionalData = null;
                        custom_order_id = null;
                        school_id = null;
                    }
                }
                if (order.payment_group && order.payment_group === 'VBA_TRANSFER') {
                    const requestStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                        cf_payment_id: order.cf_payment_id,
                    });
                    if (requestStatus) {
                        const req = await this.databaseService.CollectRequestModel.findById(requestStatus.collect_id);
                        if (req) {
                            try {
                                custom_order_id = req.custom_order_id || null;
                                order.order_id = req._id;
                                additionalData = JSON.parse(req?.additional_data);
                                school_id = req.school_id;
                            }
                            catch {
                                additionalData = null;
                                custom_order_id = null;
                                school_id = null;
                            }
                        }
                    }
                }
                else {
                    if (order.order_id) {
                        customData = customOrderMap.get(order.order_id) || {};
                        try {
                            additionalData = JSON.parse(customData?.additional_data);
                        }
                        catch {
                            additionalData = null;
                        }
                    }
                }
                return {
                    ...order,
                    custom_order_id: custom_order_id || null,
                    school_id: school_id || null,
                    student_id: additionalData?.student_details?.student_id || null,
                    student_name: additionalData?.student_details?.student_name || null,
                    student_email: additionalData?.student_details?.student_email || null,
                    student_phone_no: additionalData?.student_details?.student_phone_no || null,
                    additional_data: JSON.stringify(additionalData) || null,
                    payment_id: payment_id || null,
                };
            }));
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        cashfree_service_1.CashfreeService,
        edviron_pg_service_1.EdvironPgService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map