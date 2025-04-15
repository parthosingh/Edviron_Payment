import { PayUService } from './pay-u.service';
import { DatabaseService } from 'src/database/database.service';
export declare class PayUController {
    private readonly payUService;
    private readonly databaseService;
    constructor(payUService: PayUService, databaseService: DatabaseService);
    testPayment(): Promise<any>;
    redirectPayu(req: any, res: any): Promise<void>;
    testUpi(): Promise<any>;
    handleCallback(req: any, res: any): Promise<any>;
    handleCallbackPost(req: any, res: any): Promise<any>;
    checkStatus(req: any, res: any): Promise<void>;
    handleWebhook(body: any, res: any): Promise<any>;
}
