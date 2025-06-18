import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class GatepayService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    encryptEas(data: any, keyBase64: string, ivBase64: string): Promise<any>;
    decryptEas(encryptedData: string, keyBase64: string, ivBase64: string): Promise<any>;
    createOrder(request: CollectRequest): Promise<{
        url: any;
        collect_req: CollectRequest;
    }>;
}
