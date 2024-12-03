import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { TransactionStatus } from 'src/types/transactionStatus';
export declare class CashfreeService {
    private readonly databaseService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, edvironPgService: EdvironPgService);
    initiateRefund(refund_id: string, amount: number, collect_id: string): Promise<any>;
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
        settlements_transactions: any;
    }>;
    getUpiPaymentInfoUrl(collect_id: string): Promise<{
        intentUrl: any;
        qrCodeBase64: any;
        collect_id: string;
    }>;
}
