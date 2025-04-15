import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { TransactionStatus } from 'src/types/transactionStatus';
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
        settlements_transactions: any;
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
}
