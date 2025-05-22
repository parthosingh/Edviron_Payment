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
import { CollectRequestDocument } from 'src/database/schemas/collect_request.schema';
import { DatabaseService } from 'src/database/database.service';
export declare class PosPaytmService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    initiatePOSPayment(collectRequest: CollectRequestDocument): Promise<{
        requestSent: {
            paytmMid: string;
            paytmTid: string;
            transactionDateTime: string;
            merchantTransactionId: import("mongoose").Schema.Types.ObjectId;
            merchantReferenceNo: import("mongoose").Schema.Types.ObjectId;
            transactionAmount: number;
            merchantExtendedInfo: {
                PaymentMode: string;
            };
        };
        paytmResponse: any;
    }>;
    collectPayment(collectRequest: CollectRequestDocument): Promise<{
        message: string;
        deepLink: string;
        requestDetails: {
            paytmMid: string;
            paytmTid: string;
            transactionDateTime: string;
            merchantTransactionId: import("mongoose").Schema.Types.ObjectId;
            merchantReferenceNo: import("mongoose").Schema.Types.ObjectId;
            transactionAmount: number;
            merchantExtendedInfo: {
                PaymentMode: string;
            };
        };
        paytmResponse: any;
    }>;
    getTransactionStatus(orderId: string): Promise<any>;
}
