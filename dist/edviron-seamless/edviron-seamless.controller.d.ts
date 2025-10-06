import { DatabaseService } from 'src/database/database.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { EdvironSeamlessService } from './edviron-seamless.service';
export declare class EdvironSeamlessController {
    private readonly easebuzzService;
    private readonly databaseService;
    private readonly edvironSeamlessService;
    constructor(easebuzzService: EasebuzzService, databaseService: DatabaseService, edvironSeamlessService: EdvironSeamlessService);
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
        card: {
            enc_card_number: string;
            enc_card_holder_name: string;
            enc_card_cvv: string;
            enc_card_expiry_date: string;
        };
    }, res: any): Promise<any>;
    testNB(req: any, res: any): Promise<any>;
}
