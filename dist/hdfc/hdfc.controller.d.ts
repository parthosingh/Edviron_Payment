import { HdfcService } from './hdfc.service';
import { DatabaseService } from 'src/database/database.service';
export declare class HdfcController {
    private readonly hdfcService;
    private readonly databaseService;
    constructor(hdfcService: HdfcService, databaseService: DatabaseService);
    handleRedirect(req: any, res: any): Promise<void>;
    handleCallback(body: any, res: any): Promise<void>;
}
