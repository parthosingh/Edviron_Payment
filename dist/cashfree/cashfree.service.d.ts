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
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import { platformChange } from 'src/collect/collect.controller';
export declare class CashfreeService {
    private readonly databaseService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, edvironPgService: EdvironPgService);
    initiateRefund(refund_id: string, amount: number, collect_id: string): Promise<any>;
    initiateSplitRefund(refund_amount: number, refund_id: string, refund_note: string, collect_id: string, refund_splits: [
        {
            vendor_id: string;
            amount: number;
            tags: {
                reason: string;
            };
        }
    ]): Promise<any>;
    terminateOrder(collect_id: string): Promise<any>;
    checkStatus(collect_request_id: String, collect_request: CollectRequest): Promise<{
        status: TransactionStatus;
        amount: number;
        status_code?: number;
        details?: any;
        custom_order_id?: string;
    }>;
    getTransactionForSettlements(utr: string, client_id: string, limit: number, cursor: string | null): Promise<{
        cursor: any;
        limit: any;
        settlements_transactions: any[];
    }>;
    getUpiPaymentInfoUrl(collect_id: string): Promise<{
        intentUrl: any;
        qrCodeBase64: any;
        collect_id: string;
    }>;
    settlementStatus(collect_id: string, client_id: string): Promise<{
        isSettlementComplete: boolean;
        transfer_utr: any;
        service_charge: Number;
    }>;
    initiateCapture(client_id: string, collect_id: string, capture: string, amount: number): Promise<any>;
    vendorSettlementRecon(client_id: string, start_date: string, end_date: string, utrNumber: string[], cursor?: string): Promise<any>;
    getPaymentStatus(order_id: string, client_id: string): Promise<any>;
    submitDisputeEvidence(dispute_id: string, documents: Array<{
        file: string;
        doc_type: string;
        note: string;
    }>, client_id: string): Promise<any>;
    acceptDispute(disputeId: string, client_id: string): Promise<any>;
    createMerchant(merchant_id: string, merchant_email: string, merchant_name: string, poc_phone: string, merchant_site_url: string, business_details: {
        business_legal_name: string;
        business_type: string;
        business_model: string;
        business_category?: string | null;
        business_subcategory?: string | null;
        business_pan?: string | null;
        business_address?: string | null;
        business_city?: string | null;
        business_state?: string | null;
        business_postalcode?: string | null;
        business_country?: string | null;
        business_gstin?: string | null;
        business_cin?: string | null;
    }, website_details: {
        website_contact_us: string;
        website_privacy_policy: string;
        website_refund_policy: string;
        website_tnc: string;
    }, bank_account_details: {
        bank_account_number?: string | null;
        bank_ifsc?: string | null;
    }, signatory_details: {
        signatory_name: string;
        signatory_pan?: string;
    }): Promise<string>;
    initiateMerchantOnboarding(school_id: string, kyc_mail: string): Promise<string>;
    uploadKycDocs2(school_id: string): Promise<any>;
    uploadKycDocs(school_id: string): Promise<{
        document: string;
        response: any;
    }[]>;
    getMerchantInfo(school_id: string, kyc_mail: string): Promise<{
        merchant_id: string;
        merchant_email: string;
        merchant_name: string;
        poc_phone: string;
        merchant_site_url: string;
        business_details: {
            business_legal_name: string;
            business_type: string;
            business_model: string;
            business_category?: string | null;
            business_subcategory?: string | null;
            business_pan?: string | null;
            business_address?: string | null;
            business_city?: string | null;
            business_state?: string | null;
            business_postalcode?: string | null;
            business_country?: string | null;
            business_gstin?: string | null;
            business_cin?: string | null;
        };
        website_details: {
            website_contact_us: string;
            website_privacy_policy: string;
            website_refund_policy: string;
            website_tnc: string;
        };
        bank_account_details: {
            bank_account_number?: string | null;
            bank_ifsc?: string | null;
        };
        signatory_details: {
            signatory_name: string;
            signatory_pan?: string;
        };
    }>;
    getFilenameFromUrlOrContentType(url: string, contentType: string | undefined): Promise<string>;
    extractFilenameFromUrl(url: string): Promise<string>;
    createVBA(cf_x_client_id: string, cf_x_clien_secret: string, virtual_account_details: {
        virtual_account_id: string;
        virtual_account_name: string;
        virtual_account_email: string;
        virtual_account_phone: string;
    }, notification_group: string): Promise<any>;
    createVBAV2(cf_x_client_id: string, cf_x_clien_secret: string, virtual_account_details: {
        virtual_account_id: string;
        virtual_account_name: string;
        virtual_account_email: string;
        virtual_account_phone: string;
    }, notification_group: string, amount: number): Promise<any>;
    createNonSeamlessOrder(request: CollectRequest, cashfreeVedors?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ], isSplitPayments?: boolean): Promise<any>;
    createOrderV2(amount: Number, callbackUrl: string, school_id: string, trustee_id: string, disabled_modes: string[] | undefined, platform_charges: platformChange[], cashfree_credentials: {
        cf_x_client_id: string;
        cf_x_client_secret: string;
        cf_api_key: string;
    }, clientId: string, clientSecret: string, webHook?: string, additional_data?: {}, custom_order_id?: string, req_webhook_urls?: string[], school_name?: string, splitPayments?: boolean, vendor?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
            scheme_code?: string;
        }
    ], vendorgateway?: {
        easebuzz: boolean;
        cashfree: boolean;
    }, cashfreeVedors?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ], isVBAPayment?: boolean, vba_account_number?: string): Promise<{
        _id: import("mongoose").Schema.Types.ObjectId;
        url: string;
    }>;
}
