import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class NttdataService {
    private readonly databaseService;
    private readonly ENC_KEY;
    private readonly REQ_SALT;
    private readonly IV;
    private readonly ALGORITHM;
    private readonly PASSWORD;
    private readonly SALT;
    constructor(databaseService: DatabaseService);
    encrypt(text: string): string;
    decrypt(text: string): string;
    createOrder(request: CollectRequest): Promise<{
        url: string;
        collect_req: CollectRequest;
    }>;
    getTransactionStatus(collect_id: string): Promise<{
        status: any;
        amount: number;
        status_code: number;
        details: string;
        custom_order_id: string | null;
    }>;
    terminateOrder(collect_id: string): Promise<boolean>;
}
