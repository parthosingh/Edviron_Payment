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
const _jwt = require("jsonwebtoken");
const mongoose_1 = require("mongoose");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
let EdvironPayController = class EdvironPayController {
    constructor(databaseService, edvironPay, edvironPgService) {
        this.databaseService = databaseService;
        this.edvironPay = edvironPay;
        this.edvironPgService = edvironPgService;
    }
    async upsertInstallments(body) {
        try {
            const { school_id, trustee_id, student_detail, additional_data, amount, net_amount, discount, year, month, gateway, isInstallement, installments, allvendors, cashfreeVedors, easebuzzVendors, callback_url, webhook_url, sign, } = body;
            const { student_id, student_number, student_name, student_email } = student_detail;
            await this.edvironPay.createStudent(student_detail, school_id, trustee_id);
            if (isInstallement && installments && Array.isArray(installments)) {
                const validateSequentialTrue = (key) => {
                    let foundFalse = false;
                    for (let i = 0; i < installments.length; i++) {
                        const val = installments[i][key];
                        if (val === true && foundFalse) {
                            throw new common_1.BadRequestException(`Invalid sequence: '${key}: true' found at index ${i} after a 'false'. '${key}' values must be sequential from start.`);
                        }
                        if (val === false || val === undefined) {
                            foundFalse = true;
                        }
                    }
                };
                validateSequentialTrue('preSelected');
                validateSequentialTrue('isPaid');
                const studentId = student_id;
                const allInstallments = await this.databaseService.InstallmentsModel.find({
                    student_id: studentId,
                }).lean();
                for (const installment of installments) {
                    const currentMonth = Number(installment.month);
                    const currentYear = Number(installment.year);
                    const previousInstallments = allInstallments.filter((inst) => Number(inst.year) < currentYear ||
                        (Number(inst.year) === currentYear &&
                            Number(inst.month) < currentMonth));
                    if (previousInstallments && previousInstallments.length > 0) {
                        if (installment.isPaid === true) {
                            const unpaid = previousInstallments.find((inst) => inst.status === 'unpaid');
                            if (unpaid) {
                                throw new common_1.BadRequestException(`Cannot mark installment for ${installment.month}/${installment.year} as paid because a previous installment (${unpaid.month}/${unpaid.year}) is still unpaid.`);
                            }
                        }
                        if (installment.preSelected === true) {
                            const preselect = previousInstallments.find((inst) => inst.preSelected === false || inst.preSelected === undefined);
                            if (preselect) {
                                throw new common_1.BadRequestException(`Cannot mark installment for ${installment.month}/${installment.year} as preSelected because a previous installment (${preselect.month}/${preselect.year}) is not preSelected.`);
                            }
                        }
                    }
                }
            }
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
                        let newinstallment;
                        if (installment.isPaid) {
                            let mode = installment.payment_mode;
                            console.log(mode, 'mode', installment?.payment_detail, 'test');
                            if (!mode) {
                                throw new common_1.BadRequestException('payment mode required');
                            }
                            let detail;
                            let payment_method;
                            switch (mode) {
                                case 'demand_draft':
                                    payment_method = 'demand_draft';
                                    detail = {
                                        demand_draft: {
                                            dd_number: installment?.payment_detail?.dd_detail?.dd_number ||
                                                'N/A',
                                            bank_name: installment?.payment_detail?.dd_detail?.bank_name ||
                                                'N/A',
                                            branch_name: installment?.payment_detail?.dd_detail?.branch_name ||
                                                'N/A',
                                            depositor_name: installment?.payment_detail?.dd_detail
                                                ?.depositor_name || 'N/A',
                                            remarks: installment?.payment_detail?.dd_detail?.remark ||
                                                'N/A',
                                        },
                                    };
                                    break;
                                case 'CASH':
                                    payment_method = 'cash';
                                    detail = {
                                        cash: {
                                            amount,
                                            notes: installment?.payment_detail?.cash_detail?.notes || {},
                                            depositor_name: installment?.payment_detail?.cash_detail
                                                ?.depositor_name || 'N/A',
                                            collector_name: installment?.payment_detail?.cash_detail
                                                ?.collector_name || 'N/A',
                                            remark: installment?.payment_detail?.cash_detail?.remark ||
                                                'N/A',
                                            date: installment?.payment_detail?.cash_detail?.date ||
                                                'N/A',
                                            total_cash_amount: installment?.payment_detail?.cash_detail
                                                ?.total_cash_amount || 'N/A',
                                        },
                                    };
                                    break;
                                case 'STATIC_QR':
                                    payment_method = 'upi';
                                    detail = {
                                        upi: {
                                            amount,
                                            upi_id: installment?.payment_detail?.static_qr?.upiId || {},
                                            transaction_amount: installment?.payment_detail?.static_qr
                                                ?.transactionAmount || 'N/A',
                                            bank_ref: installment?.payment_detail?.static_qr
                                                ?.bankReferenceNo || 'N/A',
                                            app_name: installment?.payment_detail?.static_qr?.appName ||
                                                'N/A',
                                        },
                                    };
                                    break;
                                case 'cheque':
                                    payment_method = 'cheque';
                                    detail = {
                                        cheque: {
                                            cheque_no: installment?.payment_detail?.cheque_detail?.chequeNo,
                                            date_on_cheque: installment?.payment_detail?.cheque_detail
                                                ?.dateOnCheque,
                                            amount,
                                            remarks: installment?.payment_detail?.cheque_detail?.remarks ||
                                                'N/A',
                                            payer: {
                                                account_holder_name: installment?.payment_detail?.cheque_detail
                                                    ?.accountHolderName || 'N/A',
                                                bank_name: installment?.payment_detail?.cheque_detail
                                                    ?.bankName || 'N/A',
                                            },
                                        },
                                    };
                                    break;
                                case 'upi':
                                    if (!installment?.payment_detail?.upi?.upi_id) {
                                        throw new common_1.BadRequestException('upi id is required');
                                    }
                                    payment_method = 'upi';
                                    detail = {
                                        upi: {
                                            channel: null,
                                            upi_id: installment?.payment_detail?.upi?.upi_id,
                                        },
                                    };
                                    break;
                                case 'credit_card':
                                    if (!installment?.payment_detail?.card?.card_bank_name ||
                                        !installment?.payment_detail?.card?.card_network ||
                                        !installment?.payment_detail?.card?.card_number ||
                                        !installment?.payment_detail?.card?.card_type) {
                                        throw new common_1.BadRequestException('All credit card details are required');
                                    }
                                    payment_method = 'credit_card';
                                    detail = {
                                        card: {
                                            card_bank_name: installment.payment_detail.card.card_bank_name,
                                            card_network: installment.payment_detail.card.card_network,
                                            card_number: installment.payment_detail.card.card_number,
                                            card_type: installment.payment_detail.card.card_type,
                                        },
                                    };
                                    break;
                                case 'debit_card':
                                    if (!installment?.payment_detail?.card?.card_bank_name ||
                                        !installment?.payment_detail?.card?.card_network ||
                                        !installment?.payment_detail?.card?.card_number ||
                                        !installment?.payment_detail?.card?.card_type) {
                                        throw new common_1.BadRequestException('All debit card details are required');
                                    }
                                    payment_method = 'debit_card';
                                    detail = {
                                        card: {
                                            card_bank_name: installment.payment_detail.card.card_bank_name,
                                            card_network: installment.payment_detail.card.card_network,
                                            card_number: installment.payment_detail.card.card_number,
                                            card_type: installment.payment_detail.card.card_type,
                                        },
                                    };
                                    break;
                                case 'net_banking':
                                    if (!installment?.payment_detail?.net_banking
                                        ?.netbanking_bank_code ||
                                        !installment?.payment_detail?.net_banking
                                            ?.netbanking_bank_name) {
                                        throw new common_1.BadRequestException('Net banking bank code and name are required');
                                    }
                                    payment_method = 'net_banking';
                                    detail = {
                                        netbanking: {
                                            channel: null,
                                            netbanking_bank_code: installment.payment_detail.net_banking
                                                .netbanking_bank_code,
                                            netbanking_bank_name: installment.payment_detail.net_banking
                                                .netbanking_bank_name,
                                        },
                                    };
                                    break;
                                case 'wallet':
                                    if (!installment?.payment_detail?.wallet?.provider) {
                                        throw new common_1.BadRequestException('Wallet provider is required');
                                    }
                                    payment_method = 'wallet';
                                    detail = {
                                        wallet: {
                                            channel: null,
                                            provider: installment.payment_detail.wallet.provider,
                                        },
                                    };
                                    break;
                                default: {
                                }
                            }
                            const request = await this.databaseService.CollectRequestModel.create({
                                amount: installment.net_amount,
                                callbackUrl: callback_url,
                                gateway: collect_request_schema_1.Gateway.EDVIRON_PAY,
                                isCollectNow: true,
                                school_id,
                                trustee_id,
                                additional_data: JSON.stringify(additional_data || {}),
                                req_webhook_urls: [webhook_url],
                                easebuzzVendors: easebuzzVendors || [],
                                cashfreeVedors: cashfreeVedors || [],
                            });
                            const requestStatus = await new this.databaseService.CollectRequestStatusModel({
                                collect_id: request._id,
                                status: collect_req_status_schema_1.PaymentStatus.SUCCESS,
                                order_amount: request.amount,
                                transaction_amount: request.amount,
                                payment_method: payment_method,
                                details: JSON.stringify(detail),
                                bank_reference: installment.payment_detail.bank_reference_number || '',
                            }).save();
                            newinstallment =
                                await this.databaseService.InstallmentsModel.create({
                                    school_id,
                                    trustee_id,
                                    student_id,
                                    student_number,
                                    student_name,
                                    student_email,
                                    additional_data,
                                    callback_url,
                                    webhook_url,
                                    amount: installment.amount,
                                    net_amount: installment.net_amount,
                                    discount: installment.discount,
                                    year: installment.year || year,
                                    month: installment.month || month,
                                    gateway,
                                    fee_heads: installment.fee_heads,
                                    status: 'paid',
                                    label: installment.label,
                                    preSelected: installment.preSelected || false,
                                    body: installment.body,
                                    isSplitPayments: split_payments,
                                    collect_id: request._id,
                                    ...vendorsBlock,
                                });
                        }
                        else {
                            newinstallment =
                                await this.databaseService.InstallmentsModel.create({
                                    school_id,
                                    trustee_id,
                                    student_id,
                                    student_number,
                                    student_name,
                                    student_email,
                                    additional_data,
                                    callback_url,
                                    webhook_url,
                                    amount: installment.amount,
                                    net_amount: installment.net_amount,
                                    discount: installment.discount,
                                    year: installment.year || year,
                                    month: installment.month || month,
                                    gateway,
                                    fee_heads: installment.fee_heads,
                                    status: 'unpaid',
                                    label: installment.label,
                                    preSelected: installment.preSelected || false,
                                    body: installment.body,
                                    isSplitPayments: split_payments,
                                    ...vendorsBlock,
                                });
                        }
                        return newinstallment;
                    }
                    if (existing.status === 'paid') {
                        return existing;
                    }
                    let updateExisting;
                    if (installment.isPaid) {
                        let mode = installment.payment_mode;
                        if (!mode) {
                            throw new common_1.BadRequestException('payment mode required');
                        }
                        let detail;
                        let payment_method;
                        switch (mode) {
                            case 'demand_draft':
                                payment_method = 'demand_draft';
                                detail = {
                                    demand_draft: {
                                        dd_number: installment?.payment_detail?.dd_detail?.dd_number ||
                                            'N/A',
                                        bank_name: installment?.payment_detail?.dd_detail?.bank_name ||
                                            'N/A',
                                        branch_name: installment?.payment_detail?.dd_detail?.branch_name ||
                                            'N/A',
                                        depositor_name: installment?.payment_detail?.dd_detail
                                            ?.depositor_name || 'N/A',
                                        remarks: installment?.payment_detail?.dd_detail?.remark || 'N/A',
                                    },
                                };
                                break;
                            case 'upi':
                                if (!installment?.payment_detail?.upi?.upi_id) {
                                    throw new common_1.BadRequestException('upi id is required');
                                }
                                payment_method = 'upi';
                                detail = {
                                    upi: {
                                        channel: null,
                                        upi_id: installment?.payment_detail?.upi?.upi_id,
                                    },
                                };
                                break;
                            case 'credit_card':
                                if (!installment?.payment_detail?.card?.card_bank_name ||
                                    !installment?.payment_detail?.card?.card_network ||
                                    !installment?.payment_detail?.card?.card_number ||
                                    !installment?.payment_detail?.card?.card_type) {
                                    throw new common_1.BadRequestException('All credit card details are required');
                                }
                                payment_method = 'credit_card';
                                detail = {
                                    card: {
                                        card_bank_name: installment.payment_detail.card.card_bank_name,
                                        card_network: installment.payment_detail.card.card_network,
                                        card_number: installment.payment_detail.card.card_number,
                                        card_type: installment.payment_detail.card.card_type,
                                    },
                                };
                                break;
                            case 'debit_card':
                                if (!installment?.payment_detail?.card?.card_bank_name ||
                                    !installment?.payment_detail?.card?.card_network ||
                                    !installment?.payment_detail?.card?.card_number ||
                                    !installment?.payment_detail?.card?.card_type) {
                                    throw new common_1.BadRequestException('All debit card details are required');
                                }
                                payment_method = 'debit_card';
                                detail = {
                                    card: {
                                        card_bank_name: installment.payment_detail.card.card_bank_name,
                                        card_network: installment.payment_detail.card.card_network,
                                        card_number: installment.payment_detail.card.card_number,
                                        card_type: installment.payment_detail.card.card_type,
                                    },
                                };
                                break;
                            case 'net_banking':
                                if (!installment?.payment_detail?.net_banking
                                    ?.netbanking_bank_code ||
                                    !installment?.payment_detail?.net_banking
                                        ?.netbanking_bank_name) {
                                    throw new common_1.BadRequestException('Net banking bank code and name are required');
                                }
                                payment_method = 'net_banking';
                                detail = {
                                    netbanking: {
                                        channel: null,
                                        netbanking_bank_code: installment.payment_detail.net_banking
                                            .netbanking_bank_code,
                                        netbanking_bank_name: installment.payment_detail.net_banking
                                            .netbanking_bank_name,
                                    },
                                };
                                break;
                            case 'wallet':
                                if (!installment?.payment_detail?.wallet?.provider) {
                                    throw new common_1.BadRequestException('Wallet provider is required');
                                }
                                payment_method = 'wallet';
                                detail = {
                                    wallet: {
                                        channel: null,
                                        provider: installment.payment_detail.wallet.provider,
                                    },
                                };
                                break;
                            default: {
                            }
                        }
                        const request = await this.databaseService.CollectRequestModel.create({
                            amount: installment.net_amount,
                            callbackUrl: callback_url,
                            gateway: collect_request_schema_1.Gateway.EDVIRON_PAY,
                            isCollectNow: true,
                            school_id,
                            trustee_id,
                            additional_data: JSON.stringify(additional_data || {}),
                            req_webhook_urls: [webhook_url],
                            easebuzzVendors: easebuzzVendors || [],
                            cashfreeVedors: cashfreeVedors || [],
                        });
                        const requestStatus = await new this.databaseService.CollectRequestStatusModel({
                            collect_id: request._id,
                            status: collect_req_status_schema_1.PaymentStatus.SUCCESS,
                            order_amount: request.amount,
                            transaction_amount: request.amount,
                            payment_method: payment_method,
                            details: JSON.stringify(detail),
                            bank_reference: installment.payment_detail.bank_reference_number || '',
                        }).save();
                        updateExisting =
                            await this.databaseService.InstallmentsModel.findOneAndUpdate(filter, {
                                $set: {
                                    collect_id: request._id,
                                    status: 'paid',
                                },
                            });
                    }
                    else {
                        updateExisting =
                            await this.databaseService.InstallmentsModel.updateOne(filter, {
                                $set: {
                                    amount: installment.amount,
                                    net_amount: installment.net_amount,
                                    discount: installment.discount,
                                    fee_head: installment.fee_head,
                                    label: installment.label,
                                    preSelected: installment.preSelected || false,
                                    body: installment.body,
                                    gateway,
                                    callback_url,
                                    webhook_url,
                                    additional_data,
                                    student_number,
                                    student_name,
                                    student_email,
                                    fee_heads: installment.fee_heads,
                                    status: 'unpaid',
                                    isSplitPayments: split_payments,
                                    ...vendorsBlock,
                                },
                            });
                    }
                    return updateExisting;
                }));
            }
            else {
                throw new Error('No installments found or isInstallement is false');
            }
            console.log('Installments upserted successfully');
            return {
                status: 'installment updated successfully for student_id: ' + student_id,
                student_id: student_id,
                school_id: school_id,
                url: `${process.env.PG_FRONTEND}/collect-fee?student_id=${student_id}&school_id=${school_id}&trustee_id=${trustee_id}`,
            };
        }
        catch (error) {
            console.log(error, 'error');
            throw new common_1.BadRequestException(error.response);
        }
    }
    async getInstallmentPayments(req) {
        try {
            const { student_id, school_id } = req.query;
            const checkStudent = await this.databaseService.StudentDetailModel.findOne({
                student_id,
                school_id: new mongoose_1.Types.ObjectId(school_id),
            });
            if (!checkStudent) {
                throw new common_1.BadRequestException('Student not found');
            }
            const config = {
                method: 'get',
                url: `${process.env.VANILLA_SERVICE}/erp/installment-sign?school_id=${checkStudent?.school_id}&trustee_id=${checkStudent?.trustee_id}&student_id=${student_id}`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                },
            };
            const { data } = await axios_1.default.request(config);
            const url = `${process.env.PG_FRONTEND}/collect-fee?student_id=${student_id}&school_id=${checkStudent?.school_id}&trustee_id=${checkStudent?.trustee_id}&token=${data.sign}`;
            return { url };
        }
        catch (e) {
            console.log(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async collect(body, req, res) {
        const { mode, isInstallment, InstallmentsIds, school_id, trustee_id, callback_url, webhook_url, token, amount, disable_mode, custom_order_id, school_name, isSplit, isVBAPayment, additional_data, gateway, cashfree, razorpay, vba_account_number, easebuzz, easebuzzVendors, cashfreeVedors, razorpay_vendors, cash_detail, dd_detail, document_url, student_detail, static_qr, netBankingDetails, cheque_detail, date, parents_info, remark, } = body;
        try {
            let { student_id, student_name, student_email, student_number } = student_detail;
            if (!token) {
                throw new Error('Token is required');
            }
            const decrypt = _jwt.verify(token, process.env.KEY);
            console.log(decrypt, 'decrypt');
            if (decrypt.school_id.toString() !== school_id.toString()) {
                throw new common_1.BadRequestException('Request fordge');
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
                    easebuzz_non_partner_cred: {
                        easebuzz_salt: easebuzz.salt,
                        easebuzz_key: easebuzz.key,
                        easebuzz_merchant_email: easebuzz.easebuzz_merchant_email,
                        easebuzz_submerchant_id: easebuzz.mid,
                    },
                    easebuzzVendors: easebuzzVendors || [],
                    cashfreeVedors: cashfreeVedors || [],
                    razorpay_vendors_info: razorpay_vendors,
                    isVBAPayment: isVBAPayment || false,
                    school_name,
                    isSplitPayments: isSplit || false,
                    cashfree_credentials: cashfreeCred,
                    isCFNonSeamless: !cashfree?.isSeamless || false,
                    vba_account_number,
                    document_url,
                });
                const requestStatus = await new this.databaseService.CollectRequestStatusModel({
                    collect_id: request._id,
                    status: collect_req_status_schema_1.PaymentStatus.PENDING,
                    order_amount: request.amount,
                    transaction_amount: request.amount,
                    payment_method: null,
                }).save();
                let student_details = await new this.databaseService.StudentDetailModel({
                    student_id: student_id,
                    student_name,
                    trustee_id,
                    school_id,
                    student_email,
                    student_number,
                }).save();
                await this.databaseService.InstallmentsModel.updateMany({ _id: { $in: InstallmentsIds } }, { $set: { collect_id: request._id, status: 'pending' } });
                if (mode === 'EDVIRON_CASH') {
                    let collectIdObject = request._id;
                    const detail = {
                        cash: {
                            amount,
                            notes: cash_detail?.note || {},
                            depositor_name: cash_detail?.depositor_name || 'N/A',
                            collector_name: cash_detail?.collector_name || 'N/A',
                            remark: cash_detail?.remark || remark || 'N/A',
                            date: cash_detail?.date || 'N/A',
                            total_cash_amount: cash_detail?.total_cash_amount || 'N/A',
                        },
                    };
                    await this.databaseService.CollectRequestModel.updateOne({
                        _id: collectIdObject,
                    }, {
                        $set: {
                            gateway: collect_request_schema_1.Gateway.EDVIRON_PAY,
                        },
                    });
                    const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                        collect_id: collectIdObject,
                    }, {
                        $set: {
                            status: 'SUCCESS',
                            payment_time: cash_detail?.date
                                ? new Date(cash_detail?.date).toISOString()
                                : new Date().toISOString(),
                            transaction_amount: amount,
                            payment_method: 'cash',
                            details: JSON.stringify(detail),
                            bank_reference: 'N/A',
                            reason: `payment successfully collected by ${(cash_detail && cash_detail?.collector_name) || 'school'}`,
                            payment_message: `payment successfully collected by ${(cash_detail && cash_detail?.collector_name) || 'school'}`,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    const updateinstallments = await this.databaseService.InstallmentsModel.updateMany({
                        _id: { $in: InstallmentsIds },
                        school_id,
                        trustee_id,
                    }, {
                        $set: {
                            status: 'paid',
                            payment_time: cash_detail?.date
                                ? new Date(cash_detail?.date).toISOString()
                                : new Date().toISOString(),
                        },
                    });
                    const callbackUrl = new URL(request.callbackUrl);
                    callbackUrl.searchParams.set('status', 'SUCCESS');
                    return res.json({ redirectUrl: callbackUrl.toString() });
                }
                if (mode === 'EDVIRON_STATIC_QR') {
                    let collectIdObject = request._id;
                    const detail = {
                        upi: {
                            amount,
                            upi_id: static_qr?.upiId || {},
                            transaction_amount: static_qr?.transactionAmount || 'N/A',
                            bank_ref: static_qr?.bankReferenceNo || 'N/A',
                            app_name: static_qr?.appName || 'N/A',
                            remark: remark || 'N/A',
                        },
                    };
                    await this.databaseService.CollectRequestModel.updateOne({
                        _id: collectIdObject,
                    }, {
                        $set: {
                            gateway: collect_request_schema_1.Gateway.EDVIRON_PAY,
                        },
                    });
                    const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                        collect_id: collectIdObject,
                    }, {
                        $set: {
                            status: 'SUCCESS',
                            payment_time: date
                                ? new Date(date).toISOString()
                                : new Date().toISOString(),
                            transaction_amount: amount,
                            payment_method: 'upi',
                            details: JSON.stringify(detail),
                            bank_reference: static_qr?.bankReferenceNo || 'N/A',
                            reason: `payment successfull with static upi`,
                            payment_message: `payment successfull with static upi`,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    const updateinstallments = await this.databaseService.InstallmentsModel.updateMany({
                        _id: { $in: InstallmentsIds },
                        school_id,
                        trustee_id,
                    }, {
                        $set: {
                            status: 'paid',
                            payment_time: date
                                ? new Date(date).toISOString()
                                : new Date().toISOString(),
                        },
                    });
                    const callbackUrl = new URL(request.callbackUrl);
                    callbackUrl.searchParams.set('status', 'SUCCESS');
                    return res.json({ redirectUrl: callbackUrl.toString() });
                }
                if (mode === 'DEMAND_DRAFT') {
                    let collectIdObject = request._id;
                    const detail = {
                        demand_draft: {
                            amount,
                            dd_number: dd_detail?.dd_number || 'N/A',
                            bank_name: dd_detail?.bank_name || 'N/A',
                            branch_name: dd_detail?.branch_name || 'N/A',
                            depositor_name: dd_detail?.depositor_name || 'N/A',
                            remarks: dd_detail?.remark || remark || 'N/A',
                        },
                    };
                    await this.databaseService.CollectRequestModel.updateOne({
                        _id: collectIdObject,
                    }, {
                        $set: {
                            gateway: collect_request_schema_1.Gateway.EDVIRON_PAY,
                        },
                    });
                    const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                        collect_id: collectIdObject,
                    }, {
                        $set: {
                            status: 'SUCCESS',
                            payment_time: dd_detail?.date
                                ? new Date(dd_detail?.date).toISOString()
                                : new Date().toISOString(),
                            transaction_amount: amount,
                            payment_method: 'demand_draft',
                            details: JSON.stringify(detail),
                            bank_reference: dd_detail?.dd_number || 'N/A',
                            reason: `Payment successfully collected via Demand Draft ${dd_detail?.dd_number
                                ? `(DD No: ${dd_detail.dd_number})`
                                : ''} from ${dd_detail?.depositor_name || 'payer'}`,
                            payment_message: `Payment successfully collected via Demand Draft ${dd_detail?.dd_number
                                ? `(DD No: ${dd_detail.dd_number})`
                                : ''} from ${dd_detail?.depositor_name || 'payer'}`,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    const updateinstallments = await this.databaseService.InstallmentsModel.updateMany({
                        _id: { $in: InstallmentsIds },
                        school_id,
                        trustee_id,
                    }, {
                        $set: {
                            status: 'paid',
                            payment_time: dd_detail?.date
                                ? new Date(dd_detail?.date).toISOString()
                                : new Date().toISOString(),
                        },
                    });
                    const callbackUrl = new URL(request.callbackUrl);
                    callbackUrl.searchParams.set('status', 'SUCCESS');
                    return res.json({ redirectUrl: callbackUrl.toString() });
                }
                if (mode === 'EDVIRON_NETBANKING') {
                    let collectIdObject = request._id;
                    const detail = {
                        net_banking: {
                            utr: netBankingDetails?.utr,
                            amount,
                            transaction_amount: amount,
                            remarks: netBankingDetails?.remarks || remark || 'N/A',
                            payer: {
                                bank_holder_name: netBankingDetails?.payer?.bank_holder_name || 'N/A',
                                bank_name: netBankingDetails?.payer?.bank_name || 'N/A',
                                ifsc: netBankingDetails?.payer?.ifsc || 'N/A',
                                account_no: netBankingDetails?.payer?.account_no || 'N/A',
                            },
                            recivers: {
                                bank_holder_name: netBankingDetails?.recivers.bank_holder_name || 'N/A',
                                bank_name: netBankingDetails?.recivers.bank_name || 'N/A',
                                ifsc: netBankingDetails?.recivers.ifsc || 'N/A',
                            },
                        },
                    };
                    await this.databaseService.CollectRequestModel.updateOne({
                        _id: collectIdObject,
                    }, {
                        $set: {
                            gateway: collect_request_schema_1.Gateway.EDVIRON_PAY,
                        },
                    });
                    const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                        collect_id: collectIdObject,
                    }, {
                        $set: {
                            status: 'SUCCESS',
                            payment_time: date
                                ? new Date(date).toISOString()
                                : new Date().toISOString(),
                            transaction_amount: netBankingDetails?.amount,
                            payment_method: 'net_banking',
                            details: JSON.stringify(detail),
                            bank_reference: netBankingDetails?.utr || 'N/A',
                            reason: `Payment successfully collected via NetBanking (UTR: ${netBankingDetails?.utr || 'N/A'}) from ${netBankingDetails?.payer?.bank_holder_name || 'payer'}`,
                            payment_message: `Payment successfully collected via NetBanking (UTR: ${netBankingDetails?.utr || 'N/A'}) from ${netBankingDetails?.payer?.bank_holder_name || 'payer'}`,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    const updateinstallments = await this.databaseService.InstallmentsModel.updateMany({
                        _id: { $in: InstallmentsIds },
                        school_id,
                        trustee_id,
                    }, {
                        $set: {
                            status: 'paid',
                            payment_time: date
                                ? new Date(date).toISOString()
                                : new Date().toISOString(),
                        },
                    });
                    const callbackUrl = new URL(request.callbackUrl);
                    callbackUrl.searchParams.set('status', 'SUCCESS');
                    return res.json({ redirectUrl: callbackUrl.toString() });
                }
                if (mode === 'CHEQUE') {
                    let collectIdObject = request._id;
                    const detail = {
                        cheque: {
                            cheque_no: cheque_detail?.chequeNo,
                            date_on_cheque: cheque_detail?.dateOnCheque,
                            amount,
                            remarks: cheque_detail?.remarks || remark || 'N/A',
                            payer: {
                                account_holder_name: cheque_detail?.accountHolderName || 'N/A',
                                bank_name: cheque_detail?.bankName || 'N/A',
                            },
                        },
                    };
                    await this.databaseService.CollectRequestModel.updateOne({
                        _id: collectIdObject,
                    }, {
                        $set: {
                            gateway: collect_request_schema_1.Gateway.EDVIRON_PAY,
                        },
                    });
                    const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                        collect_id: collectIdObject,
                    }, {
                        $set: {
                            status: 'SUCCESS',
                            payment_time: cheque_detail?.dateOnCheque
                                ? new Date(cheque_detail?.dateOnCheque).toISOString()
                                : new Date().toISOString(),
                            transaction_amount: amount,
                            payment_method: 'cheque',
                            details: JSON.stringify(detail),
                            bank_reference: 'N/A',
                            reason: `Payment successfully collected via cheque (cheque number: ${cheque_detail?.chequeNo}`,
                            payment_message: `Payment successfully collected via cheque (cheque number: ${cheque_detail?.chequeNo}`,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    const updateinstallments = await this.databaseService.InstallmentsModel.updateMany({
                        _id: { $in: InstallmentsIds },
                        school_id,
                        trustee_id,
                    }, {
                        $set: {
                            status: 'paid',
                            payment_time: cheque_detail?.dateOnCheque
                                ? new Date(cheque_detail?.dateOnCheque).toISOString()
                                : new Date().toISOString(),
                        },
                    });
                    const callbackUrl = new URL(request.callbackUrl);
                    callbackUrl.searchParams.set('status', 'SUCCESS');
                    return res.json({ redirectUrl: callbackUrl.toString() });
                }
                const response = await this.edvironPay.createOrder(request, school_name, gateway, platform_charges_schema_1.PlatformCharge);
                return res.send(response);
            }
        }
        catch (e) {
            console.log(e);
            if (e?.response) {
                throw new common_1.BadRequestException(e?.response?.message || 'network error');
            }
            throw new Error('Error occurred while processing payment: ' + e.message);
        }
    }
    async updateChequeStatus(collect_id, status, token) {
        try {
            if (!collect_id || !status || !token) {
                throw new common_1.BadRequestException('collect_id , token, and status are required');
            }
            const collectIdObject = new mongoose_1.Types.ObjectId(collect_id);
            const [request, collect_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!request) {
                throw new common_1.BadRequestException('Collect request not found');
            }
            if (collect_status?.payment_method !== 'cheque') {
                throw new common_1.BadRequestException('payment is not paid through cheque');
            }
            const decrypt = _jwt.verify(token, process.env.KEY);
            if (decrypt.school_id.toString() !== request.school_id.toString()) {
                throw new common_1.BadRequestException('Request fordge');
            }
            if (!collect_status) {
                throw new common_1.BadRequestException('Collect request status not found');
            }
            await this.databaseService.CollectRequestStatusModel.updateOne({
                collect_id: collectIdObject,
            }, {
                $set: {
                    status: status,
                },
            }, {
                upsert: true,
                new: true,
            });
            const InstallmentsId = await this.databaseService.InstallmentsModel.find({
                collect_id: collectIdObject,
            }).select('_id');
            const newStatus = status === 'SUCCESS'
                ? collect_req_status_schema_1.EdvironPayPaymentStatus.SUCCESS
                : status === 'FAILED'
                    ? collect_req_status_schema_1.EdvironPayPaymentStatus.UNPAID
                    : collect_req_status_schema_1.EdvironPayPaymentStatus.UNPAID;
            await this.databaseService.InstallmentsModel.updateMany({ _id: { $in: InstallmentsId } }, { $set: { status: newStatus } });
            return {
                success: true,
                message: `Cheque status updated successfully to "${status}"`,
                updatedStatus: newStatus,
                collect_id: collect_id,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.response.message || 'Something went wrong while fetching data');
        }
    }
    async getStudentInstallments(student_id, school_id, trustee_id) {
        try {
            let studentDetail = await this.edvironPay.studentFind(student_id, school_id, trustee_id);
            console.log(studentDetail, 'studentDetail');
            const config = {
                method: 'get',
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-trustee-school-logo?school_id=${school_id}&trustee_id=${trustee_id}`,
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            };
            const { data } = await axios_1.default.request(config);
            if (!studentDetail) {
                throw new common_1.BadRequestException('student not found');
            }
            studentDetail = {
                ...studentDetail,
                ...data,
            };
            let installments = await this.databaseService.InstallmentsModel.find({
                student_id,
            })
                .sort({ year: 1, month: 1 })
                .lean();
            const firstUnpaidIndex = installments.findIndex((i) => i.status == 'paid');
            if (firstUnpaidIndex !== -1) {
                installments = installments.map((installment, index) => ({
                    ...installment,
                    preSelected: index === firstUnpaidIndex,
                }));
            }
            else {
                installments = installments.map((i) => ({ ...i, preSelected: false }));
            }
            installments.sort((a, b) => Number(a.month) - Number(b.month));
            return {
                installments,
                studentDetail,
            };
        }
        catch (e) {
            if (e.response?.data?.message) {
                throw new common_1.BadRequestException(e.response.data.message);
            }
            throw new common_1.BadRequestException(e.message);
        }
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
    async orderDetail(collect_id) {
        try {
            const collect_request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!collect_request) {
                throw new common_1.BadRequestException('Order not found');
            }
            let activeGateway = 'none';
            let paymentIds = collect_request.paymentIds;
            if (paymentIds?.cashfree_id) {
                activeGateway = 'CASHFREE';
            }
            else if (paymentIds?.easebuzz_id) {
                activeGateway = 'EASEBUZZ';
            }
            else if (paymentIds?.easebuzz_upi_id) {
                activeGateway = 'EASEBUZZ_UPI';
            }
            else if (paymentIds?.easebuzz_cc_id) {
                activeGateway = 'EASEBUZZ_CC';
            }
            else if (paymentIds?.easebuzz_dc_id) {
                activeGateway = 'EASEBUZZ_DC';
            }
            else if (paymentIds?.ccavenue_id) {
                activeGateway = 'CCAVENUE';
            }
            return {
                paymentIds: collect_request.paymentIds,
                gateway: activeGateway,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error);
        }
    }
    async getErpDqr(req) {
        try {
            const { collect_id, sign } = req.query;
            const res = await this.edvironPay.erpDynamicQrRedirect(collect_id);
            return res;
        }
        catch (e) {
            console.log(e.response);
            if (e.response?.data?.message) {
                throw new common_1.BadRequestException(e.response.data.message);
            }
            throw new common_1.BadRequestException(e.message);
        }
    }
    async checkDqrStatus(collect_id) {
        try {
            const status = await this.edvironPay.checkStatusDQR(collect_id);
            return status;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async getFeeHeads(body) {
        const { startDate, endDate, trustee_id, school_id, page, limit, isCustomSearch, searchFilter, searchParams, } = body;
        try {
            const startOfDayUTC = new Date(await this.edvironPgService.convertISTStartToUTC(startDate));
            const endOfDayUTC = new Date(await this.edvironPgService.convertISTEndToUTC(endDate));
            if (!school_id) {
                throw new common_1.BadRequestException('School id required');
            }
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const skip = (pageNum - 1) * limitNum;
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            let collectQuery = {
                school_id: school_id,
                isCanteenTransaction: { $ne: true },
                createdAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                },
            };
            if (startDate && endDate) {
                collectQuery = {
                    ...collectQuery,
                    createdAt: {
                        $gte: startOfDayUTC,
                        $lt: endOfDayUTC,
                    },
                };
            }
            const installments = await this.databaseService.InstallmentsModel.aggregate([
                { $match: collectQuery },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $skip: (pageNum - 1) * limitNum,
                },
                { $limit: limitNum },
                {
                    $project: {
                        _id: 0,
                        fee_heads: 1,
                    },
                },
            ]);
            const tnxCount = await this.databaseService.InstallmentsModel.countDocuments(collectQuery);
            const totalPages = Math.ceil(tnxCount / limitNum);
            return {
                totalCount: tnxCount,
                transactionReport: installments || [],
                current_page: pageNum,
                total_pages: totalPages,
            };
        }
        catch (error) {
            console.log(error);
        }
    }
    async getStudentDetail(school_id, trustee_id, student_id, skip = 0, limit = 10) {
        try {
            const skipNum = Number(skip) || 0;
            const limitNum = Number(limit) || 10;
            const pipeline = [
                {
                    $match: {
                        school_id,
                        trustee_id,
                        ...(student_id && { student_id }),
                    },
                },
                { $skip: skipNum },
                { $limit: limitNum },
            ];
            const studentDetail = await this.databaseService.StudentDetailModel.aggregate(pipeline);
            const totalCountPipeline = [
                {
                    $match: {
                        school_id,
                        trustee_id,
                        ...(student_id && { student_id }),
                    },
                },
                { $count: 'total' },
            ];
            const totalResult = await this.databaseService.StudentDetailModel.aggregate(totalCountPipeline);
            const totalCount = totalResult[0]?.total || 0;
            const total_pages = limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1;
            const current_page = limitNum > 0 ? Math.floor(skipNum / limitNum) + 1 : 1;
            return {
                success: true,
                totalCount,
                total_pages,
                current_page,
                skip: skipNum,
                limit: limitNum,
                data: studentDetail,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getStudentInstallment(body) {
        try {
            const { school_id, trustee_id, student_id } = body;
            const installments = await this.databaseService.InstallmentsModel.find({
                school_id,
                trustee_id,
                student_id,
            });
            if (!installments) {
                return {
                    message: 'no installment found of this student',
                    installments: [],
                };
            }
            return {
                message: 'success',
                installments,
            };
        }
        catch (e) {
            let message = e?.response?.data?.message ||
                e?.response?.message ||
                e?.message ||
                'Something went wrong';
            throw new common_1.BadRequestException(message);
        }
    }
    async getSchoolData(school_id, trustee_id) {
        try {
            let query = {
                trustee_id: trustee_id,
                school_id: school_id,
            };
            const students = await this.databaseService.StudentDetailModel.find(query).lean();
            const studentIds = students.map((s) => s.student_id);
            const studentsection = students.map((s) => s.student_section);
            const number_of_section = new Set(studentsection).size;
            const number_of_students = new Set(studentIds).size;
            const installmentReport = await this.databaseService.InstallmentsModel.aggregate([
                { $match: { student_id: { $in: studentIds } } },
                {
                    $addFields: {
                        yearMonth: {
                            $dateToString: { format: "%Y-%m", date: "$createdAt" },
                        },
                        due_date: {
                            $dateFromParts: {
                                year: {
                                    $year: {
                                        $dateAdd: { startDate: "$createdAt", unit: "month", amount: 1 }
                                    }
                                },
                                month: {
                                    $month: {
                                        $dateAdd: { startDate: "$createdAt", unit: "month", amount: 1 }
                                    }
                                },
                                day: 7
                            },
                        },
                    },
                },
                {
                    $group: {
                        _id: { month: "$yearMonth", student: "$student_id" },
                        due_date: { $first: "$due_date" },
                        installments: { $push: "$$ROOT" },
                        total_amount: { $sum: "$amount" },
                        total_paid_amount: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0],
                            },
                        },
                        allPaid: {
                            $min: {
                                $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
                            },
                        },
                    },
                },
                {
                    $group: {
                        _id: "$_id.month",
                        due_date: { $first: "$due_date" },
                        total_amount: { $sum: "$total_amount" },
                        total_amount_paid: { $sum: "$total_paid_amount" },
                        total_students: { $addToSet: "$_id.student" },
                        paid_students_completely: {
                            $sum: {
                                $cond: [{ $eq: ["$allPaid", 1] }, 1, 0],
                            },
                        },
                        paid_student_ids: {
                            $addToSet: {
                                $cond: [
                                    { $eq: ["$allPaid", 1] },
                                    "$_id.student",
                                    "$$REMOVE",
                                ],
                            },
                        },
                    },
                },
                {
                    $project: {
                        month: "$_id",
                        due_date: 1,
                        total_amount: 1,
                        total_amount_paid: 1,
                        total_students: { $size: "$total_students" },
                        total_students_paid: "$paid_students_completely",
                        _id: 0,
                    },
                },
                { $sort: { month: 1 } },
            ]);
            return {
                number_of_students,
                number_of_section,
                installmentReport,
            };
        }
        catch (e) {
            let message = e?.response?.data?.message ||
                e?.response?.message ||
                e?.message ||
                'Something went wrong';
            throw new common_1.BadRequestException(message);
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
    (0, common_1.Get)('installment-payments'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getInstallmentPayments", null);
__decorate([
    (0, common_1.Post)('collect-request'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "collect", null);
__decorate([
    (0, common_1.Post)('update-cheque-status'),
    __param(0, (0, common_1.Query)('collect_id')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "updateChequeStatus", null);
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
__decorate([
    (0, common_1.Get)('get-order-detail'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "orderDetail", null);
__decorate([
    (0, common_1.Get)('/get-erp-dqr'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getErpDqr", null);
__decorate([
    (0, common_1.Get)('/dqr/check-status'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "checkDqrStatus", null);
__decorate([
    (0, common_1.Get)('/get-fee-heads'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getFeeHeads", null);
__decorate([
    (0, common_1.Get)('/get-student-detail'),
    __param(0, (0, common_1.Query)('school_id')),
    __param(1, (0, common_1.Query)('trustee_id')),
    __param(2, (0, common_1.Query)('student_id')),
    __param(3, (0, common_1.Query)('skip')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getStudentDetail", null);
__decorate([
    (0, common_1.Get)('get-student-installment'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getStudentInstallment", null);
__decorate([
    (0, common_1.Get)('get-school-data'),
    __param(0, (0, common_1.Query)('school_id')),
    __param(1, (0, common_1.Query)('trustee_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EdvironPayController.prototype, "getSchoolData", null);
exports.EdvironPayController = EdvironPayController = __decorate([
    (0, common_1.Controller)('edviron-pay'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        edviron_pay_service_1.EdvironPayService,
        edviron_pg_service_1.EdvironPgService])
], EdvironPayController);
//# sourceMappingURL=edviron-pay.controller.js.map