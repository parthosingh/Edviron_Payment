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
export declare class PayUService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    generate512HASH(key: string, txnid: string, amount: number, salt: string, firstName: string): Promise<any>;
    checkStatus(collect_id: string): Promise<{
        status: any;
        amount: number;
        transaction_amount: number;
        status_code: number;
        details: {
            payment_mode: any;
            bank_ref: any;
            payment_methods: {};
            transaction_time: any;
        };
        mode: any;
        net_amount_debit: any;
        bank_ref_num: any;
    }>;
    terminateOrder(collect_id: string): Promise<boolean>;
    settlementRecon(utr_number: string, limit?: number, page?: number): Promise<{
        transactions: (import("mongoose").Document<unknown, {}, import("src/database/schemas/collect_req_status.schema").CollectRequestStatusDocument> & import("src/database/schemas/collect_req_status.schema").CollectRequestStatus & Document & Required<{
            _id: import("mongoose").Schema.Types.ObjectId;
        }>)[];
        count: number;
        page: number;
        limit: number;
    }>;
}
