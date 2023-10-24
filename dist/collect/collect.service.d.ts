import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
export declare class CollectService {
    private readonly phonepeService;
    private readonly hdfcService;
    private readonly databaseService;
    constructor(phonepeService: PhonepeService, hdfcService: HdfcService, databaseService: DatabaseService);
    collect(amount: Number, callbackUrl: String): Promise<{
        url: string;
        request: CollectRequest;
    }>;
}
