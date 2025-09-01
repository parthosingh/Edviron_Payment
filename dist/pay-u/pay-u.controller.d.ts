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
import { PayUService } from './pay-u.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class PayUController {
    private readonly payUService;
    private readonly databaseService;
    private readonly edvironPgService;
    constructor(payUService: PayUService, databaseService: DatabaseService, edvironPgService: EdvironPgService);
    testPayment(): Promise<any>;
    redirectPayu(req: any, res: any): Promise<any>;
    testUpi(): Promise<any>;
    handleCallback(req: any, res: any): Promise<any>;
    handleCallbackPost(req: any, res: any): Promise<any>;
    checkStatus(req: any, res: any): Promise<void>;
    handleWebhook(body: any, res: any): Promise<any>;
    getSettlementsRecon(body: {
        utr: string;
        page: number;
        limit: number;
    }): Promise<{
        transactions: (import("mongoose").Document<unknown, {}, import("src/database/schemas/collect_req_status.schema").CollectRequestStatusDocument> & import("src/database/schemas/collect_req_status.schema").CollectRequestStatus & Document & Required<{
            _id: import("mongoose").Schema.Types.ObjectId;
        }>)[];
        count: number;
        page: number;
        limit: number;
    }>;
}
