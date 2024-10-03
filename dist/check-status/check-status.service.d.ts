import { DatabaseService } from 'src/database/database.service';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
export declare class CheckStatusService {
    private readonly databaseService;
    private readonly hdfcService;
    private readonly phonePeService;
    private readonly edvironPgService;
    private readonly ccavenueService;
    private readonly easebuzzService;
    constructor(databaseService: DatabaseService, hdfcService: HdfcService, phonePeService: PhonepeService, edvironPgService: EdvironPgService, ccavenueService: CcavenueService, easebuzzService: EasebuzzService);
    checkStatus(collect_request_id: String): Promise<{
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
            order_status: any;
        };
    } | {
        custom_order_id: string | null;
        status: TransactionStatus;
        amount: number;
        status_code?: number | undefined;
        details?: any;
    } | {
        status: string;
        custom_order_id: string | null;
        amount: number;
        status_code: number;
    } | undefined>;
    checkStatusByOrderId(order_id: String, school_id: string): Promise<{
        status: TransactionStatus;
        amount: number;
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
        status: string;
        amount: number;
        edviron_order_id: string;
        status_code: number;
    } | undefined>;
}
