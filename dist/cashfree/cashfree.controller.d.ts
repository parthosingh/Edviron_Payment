import { DatabaseService } from 'src/database/database.service';
import { CashfreeService } from './cashfree.service';
export declare class CashfreeController {
    private readonly databaseService;
    private readonly cashfreeService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService);
    initiateRefund(body: any): Promise<any>;
    initiateSplitRefund(body: {
        token: string;
        refund_amount: number;
        refund_id: string;
        refund_note: string;
        collect_id: string;
        refund_splits: [
            {
                vendor_id: string;
                amount: number;
                tags: {
                    reason: string;
                };
            }
        ];
    }): Promise<any>;
    getUpiPaymentInfoUrl(req: any): Promise<{
        intentUrl: any;
        qrCodeBase64: any;
        collect_id: any;
    }>;
    getSettlementsTransactions(body: {
        limit: number;
        cursor: string | null;
    }, req: any): Promise<{
        cursor: any;
        limit: any;
        settlements_transactions: any;
    }>;
    testWebhook(req: any, res: any): Promise<any>;
    testWebhook2(req: any, res: any): Promise<any>;
    checkStatus(req: any): Promise<any>;
    disputeEvidence(body: {
        dispute_id: string;
        action: string;
        documents: Array<{
            file: string;
            doc_type: string;
            note: string;
        }>;
        client_id: string;
        sign: string;
    }): Promise<any>;
    testSecureWebhook(req: any, res: any): Promise<any>;
}
