import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class EdvironPayService {
    private readonly databaseService;
    private readonly cashfreeService;
    private readonly easebuzzService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService, easebuzzService: EasebuzzService, edvironPgService: EdvironPgService);
    createOrder(request: CollectRequest, school_name: string, gatewat: {
        cashfree: boolean;
        easebuzz: boolean;
        razorpay: boolean;
    }, platform_charges: any): Promise<{
        url: string;
    }>;
}
