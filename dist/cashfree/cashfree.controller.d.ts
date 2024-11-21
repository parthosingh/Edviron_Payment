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
}
