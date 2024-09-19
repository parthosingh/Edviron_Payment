import { DatabaseService } from 'src/database/database.service';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
export declare class CheckStatusService {
    private readonly databaseService;
    private readonly hdfcService;
    private readonly phonePeService;
    private readonly edvironPgService;
    private readonly ccavenueService;
    constructor(databaseService: DatabaseService, hdfcService: HdfcService, phonePeService: PhonepeService, edvironPgService: EdvironPgService, ccavenueService: CcavenueService);
    checkStatus(collect_request_id: String): Promise<{
        status: import("../types/transactionStatus").TransactionStatus;
        amount: number;
        paymentInstrument?: string | null | undefined;
        paymentInstrumentBank?: string | null | undefined;
    } | {
        status: any;
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
        status: string;
        amount: number;
    } | undefined>;
    checkStatusByOrderId(order_id: String, trusteeId: string): Promise<{
        status: import("../types/transactionStatus").TransactionStatus;
        amount: number;
        paymentInstrument?: string | null | undefined;
        paymentInstrumentBank?: string | null | undefined;
    } | {
        status: any;
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
        status: string;
        amount: number;
    } | undefined>;
}
