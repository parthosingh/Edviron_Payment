import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from './edviron-pg.service';
export declare class EdvironPgController {
    private readonly edvironPgService;
    private readonly databaseService;
    constructor(edvironPgService: EdvironPgService, databaseService: DatabaseService);
    handleRedirect(req: any, res: any): Promise<void>;
    handleSdkRedirect(req: any, res: any): Promise<any>;
    handleCallback(req: any, res: any): Promise<any>;
    handleEasebuzzCallback(req: any, res: any): Promise<any>;
    handleEasebuzzCallbackPost(req: any, res: any): Promise<any>;
    handleWebhook(body: any, res: any): Promise<void>;
    easebuzzWebhook(body: any, res: any): Promise<void>;
    transactionsReport(body: {
        school_id: string;
        token: string;
    }, res: any, req: any): Promise<void>;
    bulkTransactions(body: {
        trustee_id: string;
        token: string;
    }, res: any, req: any): Promise<void>;
    getErpLogo(collect_id: string): Promise<any>;
}
