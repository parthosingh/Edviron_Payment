import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class NttdataService {
    private readonly databaseService;
    private readonly IV;
    constructor(databaseService: DatabaseService);
    encrypt(text: string, ENC_KEY: any, REQ_SALT: any): string;
    decrypt(text: string, RES_ENC_KEY: any, RES_SALT: any): string;
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
    generateSignature(signature: any, secretKey: string): Promise<string>;
    initiateRefund(collect_request_id: string, amount: number): Promise<any>;
}
