import { DatabaseService } from 'src/database/database.service';
import { EasebuzzService } from './easebuzz.service';
export declare class EasebuzzController {
    private readonly easebuzzService;
    private readonly databaseService;
    constructor(easebuzzService: EasebuzzService, databaseService: DatabaseService);
    getQr(res: any, req: any): Promise<any>;
    getEncryptedInfo(res: any, req: any, body: any): Promise<any>;
    getRefundhash(req: any): Promise<any>;
    checkRefund(req: any): Promise<any>;
    settlementRecon(body: {
        submerchant_id: string;
        start_date: string;
        end_date: string;
        page_size: number;
        token: string;
    }): Promise<{
        transactions: any;
        split_payouts: any;
        peb_refunds: any;
    }>;
    updateEasebuzzDispute(body: {
        case_id: string;
        action: string;
        reason: string;
        documents: Array<{
            document_type: any;
            file_url: string;
        }>;
        sign: string;
    }): Promise<any>;
}
