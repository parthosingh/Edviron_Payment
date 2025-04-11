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
/// <reference types="mongoose" />
/// <reference types="mongoose/types/inferschematype" />
import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from './edviron-pg.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { PlatformCharge, rangeCharge } from 'src/database/schemas/platform.charges.schema';
export declare class EdvironPgController {
    private readonly edvironPgService;
    private readonly databaseService;
    private readonly easebuzzService;
    private readonly cashfreeService;
    constructor(edvironPgService: EdvironPgService, databaseService: DatabaseService, easebuzzService: EasebuzzService, cashfreeService: CashfreeService);
    handleRedirect(req: any, res: any): Promise<void>;
    handleSdkRedirect(req: any, res: any): Promise<any>;
    handleCallback(req: any, res: any): Promise<any>;
    handleEasebuzzCallback(req: any, res: any): Promise<any>;
    handleEasebuzzCallbackPost(req: any, res: any): Promise<any>;
    handleWebhook(body: any, res: any): Promise<void>;
    easebuzzWebhook(body: any, res: any): Promise<any>;
    transactionsReport(body: {
        school_id: string;
        token: string;
    }, res: any, req: any): Promise<void>;
    getTransactionInfo(body: {
        school_id: string;
        collect_request_id: string;
        token: string;
    }): Promise<any[]>;
    bulkTransactions(body: {
        trustee_id: string;
        token: string;
        searchParams?: string;
        isCustomSearch?: boolean;
        seachFilter?: string;
        payment_modes?: string[];
        isQRCode?: boolean;
        gateway?: string[];
    }, res: any, req: any): Promise<void>;
    singleTransactionReport(body: {
        collect_id: string;
        trustee_id: string;
        token: string;
        school_id: string;
    }): Promise<any[]>;
    getErpLogo(collect_id: string): Promise<any>;
    getSchoolId(collect_id: string): Promise<string>;
    easebuzzSettlement(body: any): Promise<void>;
    getGatewayName(req: any): Promise<Gateway>;
    getpaymentRatio(body: {
        school_id: string;
        mode: string;
        start_date: string;
        token?: string;
    }): Promise<{
        cashfreeSum: number;
        easebuzzSum: number;
        percentageCashfree: number;
        percentageEasebuzz: number;
    }>;
    getPgStatus(collect_id: string): Promise<{
        cashfree: boolean;
        easebuzz: boolean;
    }>;
    initiaterefund(body: {
        collect_id: string;
        amount: number;
        refund_id: string;
        token: string;
    }): Promise<any>;
    getRefundStatus(req: any): Promise<any>;
    sentMail(req: any): Promise<void>;
    terminate(req: any): Promise<any>;
    getCustomId(collect_id: string): Promise<string>;
    createVendor(body: {
        token: string;
        vendor_info: {
            vendor_id: string;
            status: string;
            name: string;
            email: string;
            phone: string;
            verify_account: string;
            dashboard_access: string;
            schedule_option: number;
            bank: {
                account_number: string;
                account_holder: string;
                ifsc: string;
            };
            kyc_details: {
                account_type: string;
                business_type: string;
                uidai?: string;
                gst?: string;
                cin?: string;
                pan?: string;
                passport_number?: string;
            };
        };
        client_id: string;
    }): Promise<any>;
    vendorTransactions(vendor_id: string, trustee_id: string, validate_trustee: string, school_id: string, collect_id: string, token: string, limit: string, page: string): Promise<{
        vendorsTransaction: any[];
        totalCount: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getVendorTransactions(body: {
        token: string;
        page: number;
        limit: number;
        trustee_id: string;
        status?: string;
        vendor_id?: string;
        school_id?: string;
        start_date?: string;
        end_date?: string;
        custom_id?: string;
        collect_id?: string;
    }): Promise<{
        vendorsTransaction: any[];
        totalCount: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    vendorSettlementRecon(body: {
        trustee_id: string;
        token: string;
        client_id: string;
        start_date: string;
        end_date: string;
        utrNumber: string[];
        cursor?: string;
    }): Promise<any>;
    getQRData(req: any): Promise<{
        intentUrl: any;
        qrCodeBase64: any;
        collect_id: string;
    } | undefined>;
    getTransactionReportBatched(start_date: string, end_date: string, trustee_id: string, school_id: string, status: string): Promise<{
        length: number;
        transactions: any[];
    }>;
    getTransactionReportBatchedFiltered(body: {
        start_date: string;
        end_date: string;
        trustee_id: string;
        status: string;
        school_id?: string | null;
        mode?: string[] | null;
        isQRPayment?: boolean | null;
        gateway?: string[] | null;
    }): Promise<{
        length: number;
        transactions: any[];
    }>;
    getErpWebhookLogs(body: {
        token: string;
        limit: number;
        page: number;
        startDate?: string;
        endDate?: string;
        trustee_id: string;
        school_id?: string;
        status?: string;
        collect_id?: string;
        custom_id?: string;
    }): Promise<{
        erp_webhooks_logs: (import("mongoose").Document<unknown, {}, import("../database/schemas/erp.webhooks.logs.schema").ErpWebhooksLogs> & import("../database/schemas/erp.webhooks.logs.schema").ErpWebhooksLogs & Required<{
            _id: import("mongoose").Schema.Types.ObjectId;
        }>)[];
        totalRecords: number;
        page: number;
    }>;
    saveBatchTransactions(body: {
        trustee_id: string;
        start_date: string;
        end_date: string;
        status?: string;
    }): Promise<{
        transactions: any[];
        totalTransactions: number;
        month: string;
        year: string;
    }>;
    getBatchTransactions(query: {
        trustee_id: string;
        year: string;
        token: string;
    }): Promise<(import("mongoose").Document<unknown, {}, import("../database/schemas/batch.transactions.schema").BatchTransactionsDocument> & import("../database/schemas/batch.transactions.schema").BatchTransactions & Document & Required<{
        _id: import("mongoose").Schema.Types.ObjectId;
    }>)[]>;
    vendorTransactionsSettlement(body: {
        collect_id: string;
        token: string;
    }): Promise<any>;
    getErpTransactionInfo(req: any): Promise<any[]>;
    mannualCapture(body: {
        collect_id: string;
        amount: number;
        capture: string;
        token: string;
    }): Promise<any>;
    resolveDisputes(body: {
        collect_id: string;
        token: string;
        note: string;
        file: string;
        doc_type: string;
        dispute_id: string;
    }): Promise<void>;
    getPaymentsForOrder(req: any): Promise<string>;
    checkStatusV2(body: {
        token: string;
        trustee_id: string;
        query: {
            collect_id?: string;
            custom_order_id?: string;
        };
    }): Promise<{
        status: any;
        order_amount: any;
        custom_order_id: string;
        bank_reference: any;
        error_details: any;
        order_id: any;
        payment_completion_time: any;
        payment_currency: any;
        payment_group: any;
        payment_message: any;
        payment_method: any;
        payment_time: any;
    }>;
    getSettlementStatus(req: any): Promise<{
        isSettlementComplete: boolean;
        transfer_utr: any;
        service_charge: Number;
    }>;
    getVendonrSingleTransactions(body: {
        order_id: string;
        trustee_id: string;
        token: string;
    }): Promise<any>;
    getMerchantVendonrSingleTransactions(body: {
        order_id: string;
        token: string;
    }): Promise<any>;
    updateSchoolMdr(body: {
        token: string;
        trustee_id: string;
        school_id: string;
        platform_charges: PlatformCharge[];
    }): Promise<{
        message: string;
    }>;
    getPaymentMdr(collect_id: string, payment_mode: string, platform_type: string): Promise<{
        range_charge: {
            charge: number;
            charge_type: string;
            upto: number | null;
        } | null;
    }>;
    getApplicableCharge(amount: number, rangeCharge: {
        charge: number;
        charge_type: string;
        upto: number | null;
    }[]): Promise<{
        charge: number;
        charge_type: string;
        upto: number | null;
    } | null>;
    addCharge(body: {
        school_id: String;
        platform_type: String;
        payment_mode: String;
        range_charge: rangeCharge[];
    }): Promise<void>;
    getCollectDisableMode(collect_id: string): Promise<string[]>;
    getCardInfo(bin: string): Promise<any>;
    vendorrecon(body: {
        limit: number;
        merchant_vendor_id: string;
        settlement_id: string;
        client_id: string;
        cursor?: string | null;
    }): Promise<{
        cursor: any;
        limit: any;
        settlements_transactions: any;
    }>;
}
