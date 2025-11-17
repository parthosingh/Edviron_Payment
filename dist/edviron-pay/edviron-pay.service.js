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
const jwt = require("jsonwebtoken");
const check_status_service_1 = require("../check-status/check-status.service");
const axios = require('axios');
let EdvironPayService = class EdvironPayService {
    constructor(databaseService, cashfreeService, easebuzzService, edvironPgService, checkStatusService) {
        this.databaseService = databaseService;
        this.cashfreeService = cashfreeService;
        this.easebuzzService = easebuzzService;
        this.edvironPgService = edvironPgService;
        this.checkStatusService = checkStatusService;
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
                paymentInfo.cashfree_id = cashfreeSessionId;
                await collectReq.save();
            }
            let easebuzz_pg = false;
            if (gatewat.easebuzz) {
                easebuzz_pg = true;
                let easebuzzSessionId;
                if (request.isSplitPayments) {
                    easebuzzSessionId = await this.easebuzzService.createOrderV3(request, platform_charges, school_name);
                }
                else {
                    easebuzzSessionId = await this.easebuzzService.createOrderV3NonSplit(request, platform_charges, school_name);
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
            if (err?.response) {
                throw new common_1.BadRequestException(err?.response?.message || 'cashfree error');
            }
            throw new common_1.BadRequestException(err.message);
        }
    }
    async checkStatus(collect_id) {
        try {
            return await this.checkStatusService.checkStatus(collect_id);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async createStudent(student_detail, school_id, trustee_id) {
        const { student_id, student_number, student_name, student_email, student_class, student_section, student_gender, } = student_detail;
        try {
            const studentDetail = await this.databaseService.StudentDetailModel.findOne({
                student_id: student_id,
                school_id: school_id,
                trustee_id: trustee_id,
            });
            if (!studentDetail) {
                await this.databaseService.StudentDetailModel.create({
                    student_id,
                    student_number,
                    student_name,
                    student_email,
                    student_class,
                    student_section,
                    student_gender,
                    school_id: school_id,
                    trustee_id: trustee_id,
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
            console.log(studentDetail, "studentDetail", { student_id: student_id,
                school_id: school_id,
                trustee_id: trustee_id, });
            if (!studentDetail) {
                throw new common_1.BadRequestException('student not found');
            }
            const payload = { school_id: school_id };
            const token = jwt.sign(payload, process.env.PAYMENTS_SERVICE_SECRET, {
                noTimestamp: true,
            });
            const data = { token, school_id: school_id };
            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/school-info`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                },
                data: data,
            };
            const { data: schoolData } = await axios.request(config);
            return {
                school_name: schoolData.school_name,
                student_id: studentDetail.student_id,
                student_name: studentDetail.student_name,
                trustee_id: studentDetail.trustee_id,
                school_id: studentDetail.school_id,
                student_email: studentDetail.student_email,
                student_number: studentDetail.student_number,
                student_class: studentDetail?.student_class?.toUpperCase() || 'N/A',
                student_section: studentDetail?.student_section || 'N/A',
                student_gender: studentDetail?.student_gender
            };
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
    async erpDynamicQrRedirect(collect_id) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectReq)
                throw new Error('Collect request not found');
            const payload = { school_id: collectReq.school_id };
            let gateway = null;
            let url = process.env.SPARKIT_DQR_URL;
            if (collectReq.paymentIds?.cashfree_id) {
                gateway = 'EDVIRON_PG';
                const upiIntent = await this.cashfreeService.getUpiIntent(collectReq.paymentIds.cashfree_id, collect_id);
                url = `${process.env.SPARKIT_DQR_URL}/displayqrcode?showmsg=false&upiurl=${encodeURIComponent(upiIntent.intentUrl)}&orderid=${collect_id}&amount=${collectReq.amount.toFixed(2)}&shopnm=SparkIT&companyname=SparkIT`;
                return { upiIntent, url, collect_id, gateway };
            }
            else if (collectReq.paymentIds?.easebuzz_id) {
                const upiIntent = await this.easebuzzService.getQrBase64(collect_id);
                url = `${process.env.SPARKIT_DQR_URL}/displayqrcode?showmsg=false&upiurl=${encodeURIComponent(upiIntent.intentUrl)}&orderid=${collect_id}&amount=${collectReq.amount.toFixed(2)}&shopnm=SparkIT&companyname=SparkIT`;
            }
            else {
                throw new common_1.BadRequestException('No UPI payment method found for this collect request');
            }
            return {
                url: url,
                collect_id: collect_id,
            };
        }
        catch (e) {
            if (e.response?.data?.message) {
                throw new common_1.BadRequestException(e.response.data.message);
            }
            throw new common_1.BadRequestException(e.message);
        }
    }
    async checkStatusDQR(collect_id) {
        try {
            const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collectReq)
                throw new Error('Collect request not found');
            const gateway = collectReq.gateway;
            if (gateway === 'PENDING') {
                return {
                    status: 'NOT INITIAT',
                    returnUrl: null,
                };
            }
            const collectReqStatus = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectReq._id,
            });
            if (!collectReqStatus)
                throw new Error('Collect request status not found');
            if (collectReqStatus.status.toUpperCase() === 'SUCCESS') {
                return {
                    status: 'SUCCESS',
                    returnUrl: `${process.env.SPARKIT_DQR_URL}/displayqrcodesucessstatus?showmsg=false&amount=${collectReq.amount}&orderid=${collect_id}&bankrrn=3123123`,
                };
            }
            else {
                const statusResponse = await this.checkStatusService.checkStatus(collect_id);
                if (statusResponse.status.toLocaleUpperCase() === 'SUCCESS') {
                    return {
                        status: 'SUCCESS',
                        returnUrl: `${process.env.SPARKIT_DQR_URL}/displayqrcodesucessstatus?showmsg=false&amount=${collectReq.amount}&orderid=${collect_id}&bankrrn=3123123`,
                    };
                }
                else if (statusResponse.status === 'NOT INITIATE') {
                    return {
                        status: 'NOT INITIATE',
                        returnUrl: null,
                    };
                }
                else {
                    return {
                        status: statusResponse.status,
                        returnUrl: `${process.env.SPARKIT_DQR_URL}/displayqrcodesucessstatus?showmsg=false&amount=${collectReq.amount}&orderid=${collect_id}&bankrrn=3123123`,
                    };
                }
                return {
                    status: null,
                    returnUrl: null,
                };
            }
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.EdvironPayService = EdvironPayService;
exports.EdvironPayService = EdvironPayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        cashfree_service_1.CashfreeService,
        easebuzz_service_1.EasebuzzService,
        edviron_pg_service_1.EdvironPgService,
        check_status_service_1.CheckStatusService])
], EdvironPayService);
//# sourceMappingURL=edviron-pay.service.js.map