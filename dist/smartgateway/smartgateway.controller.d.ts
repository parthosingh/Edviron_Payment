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
import { SmartgatewayService } from './smartgateway.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class SmartgatewayController {
    private readonly databaseService;
    private readonly smartgatewayService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, smartgatewayService: SmartgatewayService, edvironPgService: EdvironPgService);
    handleCallback(body: {
        order_id: string;
        status: string;
        sdk_status: string;
        status_id: string;
    }, res: any): Promise<any>;
    handleCallbackGet(body: {
        order_id: string;
        status: string;
        sdk_status: string;
        status_id: string;
    }, res: any): Promise<any>;
    webhook(body: any, res: any): Promise<void>;
    testy(req: any): Promise<true | (import("mongoose").Document<unknown, {}, import("src/database/schemas/collect_req_status.schema").CollectRequestStatusDocument> & import("src/database/schemas/collect_req_status.schema").CollectRequestStatus & Document & Required<{
        _id: import("mongoose").Schema.Types.ObjectId;
    }>) | undefined>;
}
