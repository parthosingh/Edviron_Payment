import { DatabaseService } from 'src/database/database.service';
import { NttdataService } from './nttdata.service';
export declare class NttdataController {
    private readonly databaseService;
    private readonly nttdataService;
    constructor(databaseService: DatabaseService, nttdataService: NttdataService);
    nttdatapayPayment(req: any, res: any): Promise<any>;
    handleCallback(req: any, res: any): Promise<any>;
    handleCallbackGet(req: any, res: any): Promise<any>;
    handleWebhook(req: any, res: any): Promise<any>;
}
