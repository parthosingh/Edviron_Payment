import { DatabaseService } from 'src/database/database.service';
import { CcavenueService } from './ccavenue.service';
export declare class CcavenueController {
    private readonly ccavenueService;
    private readonly databaseService;
    constructor(ccavenueService: CcavenueService, databaseService: DatabaseService);
    handleRedirect(req: any, res: any): Promise<void>;
    handleCallback(body: any, res: any, req: any): Promise<void>;
    handleCcavenueCallback(body: any, res: any, req: any): Promise<any>;
}
