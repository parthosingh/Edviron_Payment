import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class GatepayService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    encryptEas(data: any, keyBase64: string, ivBase64: string): Promise<any>;
    decryptEas(encryptedData: string, keyBase64: string, ivBase64: string): Promise<any>;
    createOrder(request: CollectRequest): Promise<{
        url: string;
        collect_req: CollectRequest;
    }>;
    getPaymentStatus(collect_id: string, collect_req: any): Promise<any>;
    getPaymentFromDb(collect_id: string, collect_req: any): Promise<any>;
    initiateRefund(collect_id: string, amount: number, refund_id: string): Promise<{
        collect_id: string;
        refund_id: string;
        amount: number;
        gateway: string;
        response: any;
    }>;
}
