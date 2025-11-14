/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose/types/inferschematype" />
import { DatabaseService } from 'src/database/database.service';
import { EdvironPayPaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { PaymentIds } from 'src/database/schemas/collect_request.schema';
import { EdvironPayService } from './edviron-pay.service';
import { Types } from 'mongoose';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class EdvironPayController {
    private readonly databaseService;
    private readonly edvironPay;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, edvironPay: EdvironPayService, edvironPgService: EdvironPgService);
    upsertInstallments(body: any): Promise<{
        status: string;
        student_id: any;
        school_id: any;
        url: string;
    }>;
    getInstallmentPayments(req: any): Promise<{
        url: string;
    }>;
    collect(body: {
        mode: string;
        isInstallment: boolean;
        InstallmentsIds: string[];
        school_id: string;
        trustee_id: string;
        callback_url: string;
        webhook_url: string;
        token: string;
        gateway: {
            cashfree: boolean;
            razorpay: boolean;
            easebuzz: boolean;
        };
        amount: number;
        disable_mode: string[];
        custom_order_id?: string;
        school_name: string;
        isSplit?: boolean;
        isVBAPayment?: boolean;
        vba_account_number: string;
        additional_data?: {};
        cashfree: {
            client_id: string;
            client_secret: string;
            api_key: string;
            isSeamless: boolean;
            isPartner: boolean;
            isVba: boolean;
            vba: {
                vba_account_number: string;
                vba_ifsc: string;
            };
            cashfreeVedors?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                }
            ];
        };
        razorpay: {
            key_id: string;
            key_secret: string;
            isSeamless: boolean;
            isPartner: boolean;
        };
        easebuzz: {
            mid: string;
            key: string;
            salt: string;
            isPartner: boolean;
            easebuzz_merchant_email: string;
            bank_label?: string;
            easebuzzVendors?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                }
            ];
        };
        student_detail: {
            student_id: string;
            student_name: string;
            student_number: string;
            student_email: string;
        };
        easebuzzVendors?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
            }
        ];
        cashfreeVedors?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
            }
        ];
        razorpay_vendors?: [
            {
                vendor_id: string;
                account?: string;
                percentage?: number;
                amount?: number;
                notes?: {
                    branch?: string;
                    name?: string;
                };
                linked_account_notes?: string[];
                on_hold?: boolean;
                on_hold_until?: Date;
            }
        ];
        cash_detail?: {
            note: {
                [denomination: number]: number;
            };
            total_cash_amount?: number;
            amount?: number;
            depositor_name?: string;
            collector_name?: string;
            date?: Date;
            remark?: string;
        };
        dd_detail?: {
            amount: number;
            dd_number: string;
            bank_name: string;
            branch_name: string;
            depositor_name?: string;
            date?: Date;
            remark?: string;
        };
        document_url?: string | null;
        static_qr?: {
            upiId: string;
            transactionAmount: number | string;
            bankReferenceNo: string;
            appName?: string;
        };
        netBankingDetails?: {
            utr: string;
            amount: string;
            remarks: string;
            payer: {
                bank_holder_name: string;
                bank_name: string;
                ifsc: string;
                account_no: string;
            };
            recivers: {
                bank_holder_name: string;
                bank_name: string;
                ifsc: string;
            };
        };
        cheque_detail?: {
            accountHolderName: string;
            bankName: string;
            chequeNo: string;
            dateOnCheque: string;
            remarks?: string;
        };
        parents_info: {
            name: string;
            phone: string;
            email: string;
            relationship: string;
        };
        date?: string;
        remark?: string;
    }, req?: any, res?: any): Promise<any>;
    updateChequeStatus(collect_id: string, status: string, token: string): Promise<{
        success: boolean;
        message: string;
        updatedStatus: EdvironPayPaymentStatus;
        collect_id: string;
    }>;
    getStudentInstallments(student_id: string, school_id: string, trustee_id: string): Promise<{
        installments: (import("mongoose").FlattenMaps<import("src/database/schemas/installments.schema").InstallmentsDocument> & {
            _id: Types.ObjectId;
        })[];
        studentDetail: {
            school_name: any;
            student_id: string;
            student_name: string;
            trustee_id: string;
            school_id: string;
            student_email: string;
            student_number: string;
            student_class: string;
            student_section: string;
            student_gender: string;
        };
    }>;
    getInstallCallbackCashfree(collect_id: string): Promise<void>;
    getVendorsForSchool(school_id: string): Promise<any>;
    orderDetail(collect_id: string): Promise<{
        paymentIds: PaymentIds;
        gateway: string;
    }>;
    getErpDqr(req: any): Promise<{
        upiIntent: {
            intentUrl: any;
            qrCodeBase64: any;
            collect_id: string;
        };
        url: string;
        collect_id: string;
        gateway: string;
    } | {
        url: string;
        collect_id: string;
        upiIntent?: undefined;
        gateway?: undefined;
    }>;
    checkDqrStatus(collect_id: string): Promise<{
        status: string;
        returnUrl: null;
    } | {
        status: any;
        returnUrl: string;
    } | {
        status: null;
        returnUrl: null;
    }>;
    getFeeHeads(body: {
        startDate: string;
        endDate: string;
        school_id: string;
        trustee_id?: string;
        page: string;
        limit: string;
        isCustomSearch?: boolean;
        searchFilter?: string;
        searchParams?: string;
    }): Promise<{
        totalCount: number;
        transactionReport: any[];
        current_page: number;
        total_pages: number;
    } | undefined>;
    getStudentDetail(school_id: string, trustee_id: string, student_id?: string, skip?: number, limit?: number): Promise<{
        success: boolean;
        totalCount: any;
        total_pages: number;
        current_page: number;
        skip: number;
        limit: number;
        data: any[];
    }>;
}
