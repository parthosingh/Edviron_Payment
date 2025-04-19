import { PayUService } from './pay-u.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class PayUController {
    private readonly payUService;
    private readonly databaseService;
    private readonly edvironPgService;
    constructor(payUService: PayUService, databaseService: DatabaseService, edvironPgService: EdvironPgService);
    testPayment(): Promise<any>;
    redirectPayu(req: any, res: any): Promise<void>;
    testUpi(): Promise<any>;
    handleCallback(req: any, res: any): Promise<any>;
    handleCallbackPost(req: any, res: any): Promise<any>;
    checkStatus(req: any, res: any): Promise<void>;
    handleWebhook(body: any, res: any): Promise<any>;
}
