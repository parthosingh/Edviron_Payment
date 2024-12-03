import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class EasebuzzService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    easebuzzCheckStatus(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
    statusResponse(requestId: string, collectReq: CollectRequest): Promise<any>;
    initiateRefund(collect_id: string, refund_amount: number, refund_id: string): Promise<any>;
    checkRefundSttaus(collect_id: string): Promise<any>;
    getQrBase64(collect_id: string): Promise<{
        intentUrl: string;
        qrCodeBase64: any;
        collect_id: string;
    }>;
}
