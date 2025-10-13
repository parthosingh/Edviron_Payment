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
import { CanteenService } from './canteen.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { CheckStatusService } from 'src/check-status/check-status.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';
export declare class CanteenController {
    private readonly canteenService;
    private readonly databaseService;
    private readonly edvironPgService;
    private readonly checkStatusService;
    private readonly cashfreeService;
    constructor(canteenService: CanteenService, databaseService: DatabaseService, edvironPgService: EdvironPgService, checkStatusService: CheckStatusService, cashfreeService: CashfreeService);
    createCanteenTransaction(body: {
        amount: Number;
        callbackUrl: string;
        sign: string;
        school_id: string;
        trustee_id: string;
        school_name: string;
        gateway: string[];
        canteen_id: string;
        cashfree_cred: {
            clientId: string;
            clientSecret: string;
            cf_api_key: string;
            cf_x_client_id: string;
            cf_x_client_secret: string;
            isVba: boolean;
        };
        webHook?: string;
        disabled_modes?: string[];
        additional_data?: {};
        custom_order_id?: string;
        req_webhook_urls?: string[];
        split_payments?: boolean;
        vendors_info?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
            }
        ];
    }): Promise<{
        url: string;
        request: import("mongoose").Document<unknown, {}, import("src/database/schemas/collect_request.schema").CollectRequestDocument> & import("src/database/schemas/collect_request.schema").CollectRequest & Document & Required<{
            _id: import("mongoose").Schema.Types.ObjectId;
        }>;
    } | undefined>;
    checkStatus(body: {
        collect_id: string;
        sign: string;
    }): Promise<any>;
}
