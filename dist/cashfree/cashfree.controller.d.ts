import { DatabaseService } from 'src/database/database.service';
import { CashfreeService } from './cashfree.service';
export declare class CashfreeController {
    private readonly databaseService;
    private readonly cashfreeService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService);
    initiateRefund(body: any): Promise<any>;
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
}
