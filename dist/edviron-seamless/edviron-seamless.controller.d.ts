import { DatabaseService } from 'src/database/database.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
export declare class EdvironSeamlessController {
    private readonly easebuzzService;
    private readonly databaseService;
    constructor(easebuzzService: EasebuzzService, databaseService: DatabaseService);
    initiatePayment(body: {
        school_id: string;
        trustee_id: string;
        token: string;
        mode: string;
        collect_id: string;
        amount: number;
        net_banking?: {
            bank_code: string;
        };
    }, res: any): Promise<any>;
    testNB(req: any, res: any): Promise<any>;
}
