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
exports.EdvironPayService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const cashfree_service_1 = require("../cashfree/cashfree.service");
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
let EdvironPayService = class EdvironPayService {
    constructor(databaseService, cashfreeService, easebuzzService, edvironPgService) {
        this.databaseService = databaseService;
        this.cashfreeService = cashfreeService;
        this.easebuzzService = easebuzzService;
        this.edvironPgService = edvironPgService;
    }
    async createOrder(request, school_name, gatewat, platform_charges) {
        try {
            let paymentInfo = {
                cashfree_id: null,
                easebuzz_id: null,
                easebuzz_cc_id: null,
                easebuzz_dc_id: null,
                ccavenue_id: null,
                easebuzz_upi_id: null,
            };
            const schoolName = school_name.replace(/ /g, '-');
            const collectReq = await this.databaseService.CollectRequestModel.findById(request._id);
            if (!collectReq) {
                throw new common_1.BadRequestException('Collect Request not found');
            }
            if (gatewat.cashfree) {
                const cashfreeSessionId = await this.cashfreeService.createOrderCashfree(request, request.isSplitPayments, request.cashfreeVedors);
                console.log(cashfreeSessionId);
                paymentInfo.cashfree_id = cashfreeSessionId;
                await collectReq.save();
            }
            let easebuzz_pg = false;
            if (gatewat.easebuzz) {
                easebuzz_pg = true;
                let easebuzzSessionId;
                if (request.isSplitPayments) {
                    easebuzzSessionId =
                        await this.easebuzzService.createOrderSeamlessSplit(request);
                }
                else {
                    easebuzzSessionId =
                        await this.easebuzzService.createOrderSeamlessNonSplit(request);
                }
                paymentInfo.easebuzz_id = easebuzzSessionId;
                await collectReq.save();
            }
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            const encodedPlatformCharges = encodeURIComponent(JSON.stringify(platform_charges));
            collectReq.paymentIds = paymentInfo;
            await collectReq.save();
            console.log(paymentInfo, 'sdfjdslakfjasld');
            return {
                collect_request_id: request._id,
                url: process.env.URL +
                    '/edviron-pg/redirect?session_id=' +
                    paymentInfo.cashfree_id +
                    '&collect_request_id=' +
                    request._id +
                    '&amount=' +
                    request.amount.toFixed(2) +
                    '&' +
                    disabled_modes_string +
                    '&platform_charges=' +
                    encodedPlatformCharges +
                    '&school_name=' +
                    schoolName +
                    '&easebuzz_pg=' +
                    easebuzz_pg +
                    '&payment_id=' +
                    paymentInfo.easebuzz_id,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.BadRequestException(err.message);
        }
    }
    async createStudent(student_detail, school_id, trustee_id) {
        const { student_id, student_number, student_name, student_email, section, gender, additional_info, student_class, } = student_detail;
        try {
            const studentDetail = await this.databaseService.StudentDetailModel.findOne({
                student_id: student_id,
                school_id: school_id,
                trustee_id: trustee_id,
            });
            if (!studentDetail) {
                await this.databaseService.StudentDetailModel.create({
                    student_id,
                    student_email,
                    student_name,
                    trustee_id,
                    school_id,
                    student_class,
                    section,
                    gender,
                    additional_info,
                });
            }
            return studentDetail;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async studentFind(student_id, school_id, trustee_id) {
        try {
            const studentDetail = await this.databaseService.StudentDetailModel.findOne({
                student_id: student_id,
                school_id: school_id,
                trustee_id: trustee_id,
            });
            if (!studentDetail) {
                throw new common_1.BadRequestException('student not found');
            }
            return studentDetail;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async nonEdvironInstallments(collect_id) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectReq)
                throw new Error('Collect request not found');
            let collectIdObject = collectReq._id;
            const collectReqStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            if (!collectReqStatus)
                throw new Error('Collect request not found');
            if (collectReq?.isCollectNow) {
                let status = collectReqStatus.status === 'SUCCESS' ? 'paid' : 'unpaid';
                const installments = await this.databaseService.InstallmentsModel.find({
                    collect_id: collectIdObject,
                });
                for (let installment of installments) {
                    await this.databaseService.InstallmentsModel.findOneAndUpdate({ _id: installment._id }, { $set: { status: status } }, { new: true });
                }
                return 'installments update successfull';
            }
            return 'no installment found for this collect id';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
};
exports.EdvironPayService = EdvironPayService;
exports.EdvironPayService = EdvironPayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        cashfree_service_1.CashfreeService,
        easebuzz_service_1.EasebuzzService,
        edviron_pg_service_1.EdvironPgService])
], EdvironPayService);
//# sourceMappingURL=edviron-pay.service.js.map