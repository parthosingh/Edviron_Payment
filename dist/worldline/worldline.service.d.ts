import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class WorldlineService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    createOrder(request: CollectRequest): Promise<{
        url: string;
        collect_req: CollectRequest;
    }>;
    SingleUrlIntegeration(request: CollectRequest): Promise<{
        url: string;
        collect_req: CollectRequest;
    }>;
    encryptTxthdnMsg(plainText: string, encryptionKey: string, iv: string): Promise<string>;
    decryptAES256Hex(hexData: string, encryptionKey: string, iv: string): Promise<string>;
    getStatus(collect_id: string): Promise<any>;
    formatWorldlinePaymentStatusResponse(response: any, collectRequest: CollectRequest): Promise<any>;
    initiateRefund(collect_request_id: string, amount: number): Promise<any>;
}
