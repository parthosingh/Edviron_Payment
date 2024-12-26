import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
export declare class CheckStatusService {
    private readonly databaseService;
    private readonly hdfcService;
    private readonly phonePeService;
    private readonly edvironPgService;
    private readonly ccavenueService;
    private readonly easebuzzService;
    constructor(databaseService: DatabaseService, hdfcService: HdfcService, phonePeService: PhonepeService, edvironPgService: EdvironPgService, ccavenueService: CcavenueService, easebuzzService: EasebuzzService);
    checkStatus(collect_request_id: String): Promise<"Invalid request" | {
        status: TransactionStatus;
        amount: number;
    } | {
        status: any;
        status_code: number;
        custom_order_id: string | null;
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
        status: string;
        custom_order_id: string;
        amount: number;
        status_code: number;
    } | {
        custom_order_id: string | null;
        status: TransactionStatus;
        amount: number;
        status_code?: number | undefined;
        details?: any;
    } | {
        status: PaymentStatus;
        custom_order_id: string | null;
        amount: number;
        status_code: number;
    } | undefined>;
    checkStatusByOrderId(order_id: String, school_id: string): Promise<"Invalid request" | {
        status: TransactionStatus;
        amount: number;
    } | {
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
}
