import { DatabaseService } from 'src/database/database.service';
import { CollectRequestDocument } from 'src/database/schemas/collect_request.schema';
export declare class SmartgatewayService {
    private readonly databaseService;
    private readonly API_KEY;
    constructor(databaseService: DatabaseService);
    createBase64(username: string, password?: string): Promise<string>;
    createOrder(collectRequest: CollectRequestDocument, smartgateway_customer_id: string, smartgateway_merchant_id: string, smart_gateway_api_key: string): Promise<{
        url: string;
        request: CollectRequestDocument;
    }>;
    checkStatus(collect_id: string, collectRequest: CollectRequestDocument): Promise<any>;
    terminateOrder(order_id: string, collectRequest: CollectRequestDocument): Promise<boolean>;
    refund(collect_id: string, refundAmount: number, refund_id: string): Promise<import("axios").AxiosResponse<any, any>>;
    transformHdfcTransactionStatus(data: any): Promise<any>;
}
