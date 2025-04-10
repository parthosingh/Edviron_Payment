import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { CashfreeService } from 'src/cashfree/cashfree.service';
export declare class CheckStatusService {
    private readonly databaseService;
    private readonly hdfcService;
    private readonly phonePeService;
    private readonly edvironPgService;
    private readonly ccavenueService;
    private readonly easebuzzService;
    private readonly cashfreeService;
    constructor(databaseService: DatabaseService, hdfcService: HdfcService, phonePeService: PhonepeService, edvironPgService: EdvironPgService, ccavenueService: CcavenueService, easebuzzService: EasebuzzService, cashfreeService: CashfreeService);
    checkStatus(collect_request_id: String): Promise<{
        status: TransactionStatus;
        amount: number;
    } | "Invalid request" | {
        status: any;
        status_code: number;
        custom_order_id: string | null;
        amount: number;
        details: {
            payment_mode: String;
            bank_ref: any;
            payment_method: {
                mode: any;
            };
            transaction_time: Date | undefined;
            formattedTransactionDate: string;
            order_status: any;
        };
    } | {
        status: string;
        custom_order_id: string;
        amount: number;
        status_code: number;
    } | {
        status: TransactionStatus;
        amount: Number;
        transaction_amount: Number;
        status_code: number;
        details: {
            payment_mode: String;
            bank_ref: string;
            payment_methods: any;
            transaction_time: string;
            formattedTransactionDate: string;
            order_status: TransactionStatus;
            isSettlementComplete: null;
            transfer_utr: null;
            service_charge: null;
        };
        custom_order_id: string | null;
    } | {
        custom_order_id: string | null;
        status: TransactionStatus;
        amount: number;
        transaction_amount?: number | undefined;
        status_code?: number | undefined;
        details?: any;
    } | {
        status: PaymentStatus;
        custom_order_id: string | null;
        amount: number;
        status_code: number;
        transaction_amount?: undefined;
        details?: undefined;
    } | undefined>;
    checkStatusByOrderId(order_id: String, school_id: string): Promise<{
        status: TransactionStatus;
        amount: number;
    } | "Invalid request" | {
        status: string;
        custom_order_id: string;
        amount: number;
        status_code: number;
    } | {
        status: any;
        status_code: number;
        edviron_order_id: string;
        amount: number;
        details: {
            bank_ref: any;
            payment_method: {
                mode: any;
            };
            transaction_time: Date | undefined;
            formattedTransactionDate: string;
            order_status: any;
        };
    } | {
        edviron_order_id: string;
        status: TransactionStatus;
        amount: number;
        transaction_amount?: number | undefined;
        status_code?: number | undefined;
        details?: any;
        custom_order_id?: string | undefined;
    } | {
        status: PaymentStatus;
        edviron_order_id: string;
        amount: number;
        status_code: number;
    } | undefined>;
    checkExpiry(request: CollectRequest): Promise<"Invalid request" | {
        status: string;
        custom_order_id: string;
        amount: number;
        status_code: number;
    }>;
    checkStatusV2(collect_request_id: String): Promise<{
        status: TransactionStatus;
        amount: number;
    } | "Invalid request" | {
        status: string;
        custom_order_id: string;
        amount: number;
        status_code: number;
    } | {
        status: any;
        status_code: number;
        custom_order_id: string | null;
        amount: number;
        details: {
            payment_mode: String;
            bank_ref: any;
            payment_method: {
                mode: any;
            };
            transaction_time: Date | undefined;
            formattedTransactionDate: string;
            order_status: any;
        };
    } | {
        status: TransactionStatus;
        amount: Number;
        transaction_amount: Number;
        status_code: number;
        details: {
            payment_mode: String;
            bank_ref: string;
            payment_methods: any;
            transaction_time: string;
            formattedTransactionDate: string;
            order_status: TransactionStatus;
            isSettlementComplete: null;
            transfer_utr: null;
            service_charge: null;
        };
        custom_order_id: string | null;
    } | {
        custom_order_id: string | null;
        capture_status: string;
        status: TransactionStatus;
        amount: number;
        transaction_amount?: number | undefined;
        status_code?: number | undefined;
        details?: any;
    } | {
        status: PaymentStatus;
        custom_order_id: string | null;
        amount: number;
        status_code: number;
        transaction_amount?: undefined;
        details?: undefined;
    } | undefined>;
}
