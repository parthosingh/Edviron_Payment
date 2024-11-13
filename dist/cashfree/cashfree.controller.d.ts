import { DatabaseService } from 'src/database/database.service';
export declare class CashfreeController {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    initiateRefund(body: any): Promise<any>;
    getUpiPaymentInfoUrl(req: any): Promise<{
        intentUrl: any;
        qrCodeBase64: any;
        collect_id: any;
    }>;
}
