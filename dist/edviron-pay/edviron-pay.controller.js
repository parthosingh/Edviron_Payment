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
exports.EdvironPayController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const edviron_pay_service_1 = require("./edviron-pay.service");
const platform_charges_schema_1 = require("../database/schemas/platform.charges.schema");
const axios_1 = require("axios");
let EdvironPayController = class EdvironPayController {
    constructor(databaseService, edvironPay) {
        this.databaseService = databaseService;
        this.edvironPay = edvironPay;
    }
    async upsertInstallments(body) {

        const { school_id, trustee_id, student_detail, additional_data, amount, net_amount, discount, year, month, gateway, isInstallement, installments, allvendors, cashfreeVedors, easebuzzVendors, } = body;
        let { student_id, student_number, student_name, student_email, } = student_detail;

        if (isInstallement && installments && installments.length > 0) {
            await Promise.all(installments.map(async (installment) => {
                const filter = {
                    school_id,
                    trustee_id,
                    student_id,
                    month: installment.month || month,
                    year: installment.year || year,
                };
                const { split_payments, vendors_info } = installment;
                const existing = await this.databaseService.InstallmentsModel.findOne(filter);
                const vendorsBlock = split_payments
                    ? {
                        vendors_info: allvendors,
                        cashfreeVedors: cashfreeVedors,
                        easebuzzVendors: easebuzzVendors,
                    }
                    : {};
                if (!existing) {
                    return this.databaseService.InstallmentsModel.create({
                        school_id,
                        trustee_id,
                        student_id,
                        student_number,
                        student_name,
                        student_email,
                        additional_data,
                        amount: installment.amount,
                        net_amount: installment.net_amount,
                        discount: installment.discount,
                        year: installment.year || year,
                        month: installment.month || month,
                        gateway,
                        fee_heads: installment.fee_heads,
                        status: 'unpaid',
                        label: installment.label,
                        body: installment.body,
                        isSplitPayments: split_payments,
                        ...vendorsBlock,
                    });
                }
                if (existing.status === 'paid') {
                    return existing;
                }
                return this.databaseService.InstallmentsModel.updateOne(filter, {
                    $set: {
                        amount: installment.amount,
                        net_amount: installment.net_amount,
                        discount: installment.discount,
                        fee_head: installment.fee_head,
                        label: installment.label,
                        body: installment.body,
                        gateway,
                        additional_data,
                        student_number,
                        student_name,
                        student_email,
                        fee_heads: installment.fee_heads,
                        isSplitPayments: split_payments,
                        ...vendorsBlock,
                    },
                });
            }));
        }
        else {
            throw new Error('No installments found or isInstallement is false');
        }
        console.log('Installments upserted successfully');
        return {
            status: 'installment updated successfully for student_id: ' + student_id,

            student_id: student_id,
            url: `${process.env.PG_FRONTEND}/collect-fee?student_id=${student_id}&school_id=${school_id}&trustee_id=${trustee_id}`,

        };
    }
    async collect(body) {
        const { isInstallment, InstallmentsIds, school_id, trustee_id, callback_url, webhook_url, token, amount, disable_mode, custom_order_id, school_name, isSplit, isVBAPayment, additional_data, gateway, cashfree, razorpay, vba_account_number, easebuzz, easebuzzVendors, cashfreeVedors, razorpay_vendors, } = body;
        try {
            if (!token) {
                throw new Error('Token is required');
            }
            if (custom_order_id) {
                const count = await this.databaseService.CollectRequestModel.countDocuments({
                    school_id,
                    custom_order_id,
                });
                if (count > 0) {
                    throw new common_1.ConflictException('OrderId must be unique');
                }
            }
            if (isInstallment) {
                if (!InstallmentsIds || InstallmentsIds.length === 0) {
                    console.log(InstallmentsIds);
                    throw new Error('InstallmentsIds are required for installment payments');
                }
                const installments = await this.databaseService.InstallmentsModel.find({
                    _id: { $in: InstallmentsIds },
                    school_id,
                    trustee_id,
                    status: { $ne: 'paid' },
                });
                if (installments.length !== InstallmentsIds.length) {
                    throw new Error('Some installments are invalid or already paid');
                }
                console.log(cashfree, 'api cashfree');
                const cashfreeCred = {
                    cf_x_client_id: cashfree.client_id,
                    cf_x_client_secret: cashfree.client_secret,
                    cf_api_key: cashfree.api_key,
                };
                const request = await this.databaseService.CollectRequestModel.create({
                    amount,
                    callbackUrl: callback_url,
                    gateway: collect_request_schema_1.Gateway.PENDING,
                    isCollectNow: true,
                    clientId: cashfree?.client_id || null,
                    clientSecret: cashfree?.client_secret || null,
                    disabled_modes: disable_mode,
                    school_id,
                    trustee_id,
                    additional_data: JSON.stringify(additional_data || {}),
                    custom_order_id,
                    req_webhook_urls: [webhook_url],
                    easebuzz_sub_merchant_id: easebuzz?.mid || null,
                    easebuzzVendors: easebuzzVendors || [],
                    cashfreeVedors: cashfreeVedors || [],
                    razorpay_vendors_info: razorpay_vendors,
                    isVBAPayment: isVBAPayment || false,
                    school_name,
                    isSplitPayments: isSplit || false,
                    cashfree_credentials: cashfreeCred,
                    isCFNonSeamless: !cashfree?.isSeamless || false,
                    vba_account_number,
                });
                const requestStatus = await new this.databaseService.CollectRequestStatusModel({
                    collect_id: request._id,
                    status: collect_req_status_schema_1.PaymentStatus.PENDING,
                    order_amount: request.amount,
                    transaction_amount: request.amount,
                    payment_method: null,
                }).save();
                await this.databaseService.InstallmentsModel.updateMany({ _id: { $in: InstallmentsIds } }, { $set: { collect_id: request._id, status: 'pending' } });
                return await this.edvironPay.createOrder(request, school_name, gateway, platform_charges_schema_1.PlatformCharge);
            }
        }
        catch (e) {
            console.log(e);
            throw new Error('Error occurred while processing payment: ' + e.message);
        }
    }
    async getStudentInstallments(student_id, school_id, trustee_id) {
        try {

            const studentDetail = await this.edvironPay.studentFind(student_id, school_id, trustee_id);
            if (!studentDetail) {
                throw new common_1.BadRequestException('student not found');
            }
            const installments = await this.databaseService.InstallmentsModel.find({
                student_id,
            });
            installments.sort((a, b) => Number(a.month) - Number(b.month));

            return {
                installments,
                studentDetail,
            };
        }
        catch (e) { }
    }
    async getInstallCallbackCashfree(collect_id) {
        try {
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.BadRequestException('Invalid Collect id in Callback');
            }
            request.gateway = collect_request_schema_1.Gateway.EDVIRON_PG;
        }
        catch (e) { }
    }
    async getVendorsForSchool(school_id) {
        try {
            const config = {
                method: 'get',
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-vendors-list?school_id=${school_id}`,
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            };
            const { data: vendors } = await axios_1.default.request(config);
            return vendors;
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.EdvironPayController = EdvironPayController;
__decorate([
    (0, common_1.Post)('installments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "upsertInstallments", null);
__decorate([
    (0, common_1.Post)('collect-request'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "collect", null);
__decorate([
    (0, common_1.Get)('/student-installments'),
    __param(0, (0, common_1.Query)('student_id')),
    __param(1, (0, common_1.Query)('school_id')),
    __param(2, (0, common_1.Query)('trustee_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getStudentInstallments", null);
__decorate([
    (0, common_1.Post)('/callback/cashfree'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getInstallCallbackCashfree", null);
__decorate([
    (0, common_1.Get)('/get-vendors'),
    __param(0, (0, common_1.Query)('school_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getVendorsForSchool", null);
exports.EdvironPayController = EdvironPayController = __decorate([
    (0, common_1.Controller)('edviron-pay'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        edviron_pay_service_1.EdvironPayService])
], EdvironPayController);
//# sourceMappingURL=edviron-pay.controller.js.map