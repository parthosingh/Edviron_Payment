/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose" />
/// <reference types="mongoose/types/inferschematype" />
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
    updateTransaction(order_id: string): Promise<(import("mongoose").Document<unknown, {}, import("../database/schemas/collect_req_status.schema").CollectRequestStatusDocument> & import("../database/schemas/collect_req_status.schema").CollectRequestStatus & Document & Required<{
        _id: import("mongoose").Schema.Types.ObjectId;
    }>) | undefined>;
}
