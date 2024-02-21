import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from './edviron-pg.service';
export declare class EdvironPgController {
    private readonly edvironPgService;
    private readonly databaseService;
    constructor(edvironPgService: EdvironPgService, databaseService: DatabaseService);
    handleRedirect(req: any, res: any): Promise<void>;
    handleCallback(req: any, res: any): Promise<void>;
    handleWebhook(body: any, res: any): Promise<void>;
}
