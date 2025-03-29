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
import { CollectRequest } from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus } from '../types/transactionStatus';
import { platformChange } from 'src/collect/collect.controller';
import { CashfreeService } from 'src/cashfree/cashfree.service';
export declare class EdvironPgService implements GatewayService {
    private readonly databaseService;
    private readonly cashfreeService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService);
    collect(request: CollectRequest, platform_charges: platformChange[], school_name: any, splitPayments: boolean, vendor?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ]): Promise<Transaction | undefined>;
    checkStatus(collect_request_id: String, collect_request: CollectRequest): Promise<{
        status: TransactionStatus;
        amount: number;
        transaction_amount?: number;
        status_code?: number;
        details?: any;
        custom_order_id?: string;
    }>;
    terminateOrder(collect_id: string): Promise<boolean>;
    easebuzzCheckStatus(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
    getPaymentDetails(school_id: string, startDate: string, mode: string): Promise<any[]>;
    getQr(collect_id: string, request: CollectRequest): Promise<void>;
    getSchoolInfo(school_id: string): Promise<any>;
    sendTransactionmail(email: string, request: CollectRequest): Promise<string>;
    sendErpWebhook(webHookUrl: string[], webhookData: any): Promise<void>;
    test(): Promise<void>;
    createVendor(client_id: string, vendor_info: {
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
    }): Promise<any>;
    checkCreatedVendorStatus(vendor_id: string, client_id: string): Promise<{
        name: any;
        email: any;
        vendor_id: any;
        status: any;
    }>;
    convertISTStartToUTC(dateStr: string): Promise<string>;
    convertISTEndToUTC(dateStr: string): Promise<string>;
    getVendorTransactions(query: any, limit: number, page: number): Promise<{
        vendorsTransaction: any[];
        totalCount: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getSingleTransactionInfo(collect_id: string, trustee_id: string, school_id: string): Promise<any[]>;
    getTransactionReportBatched(trustee_id: string, start_date: string, end_date: string, status?: string | null, school_id?: string | null): Promise<{
        length: number;
        transactions: any[];
    }>;
    getTransactionReportBatchedFilterd(trustee_id: string, start_date: string, end_date: string, status?: string | null, school_id?: string | null, mode?: string[] | null, isQRPayment?: boolean | null, gateway?: string[] | null): Promise<{
        length: number;
        transactions: any[];
    }>;
    generateBacthTransactions(trustee_id: string, start_date: string, end_date: string, status?: string | null): Promise<{
        transactions: any[];
        totalTransactions: number;
        month: string;
        year: string;
    }>;
    getBatchTransactions(trustee_id: string, year: string): Promise<(import("mongoose").Document<unknown, {}, import("../database/schemas/batch.transactions.schema").BatchTransactionsDocument> & import("../database/schemas/batch.transactions.schema").BatchTransactions & Document & Required<{
        _id: import("mongoose").Schema.Types.ObjectId;
    }>)[]>;
    getSingleTransaction(collect_id: string): Promise<any>;
}
