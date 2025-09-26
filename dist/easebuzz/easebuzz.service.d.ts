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
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { platformChange } from 'src/collect/collect.controller';
export declare class EasebuzzService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    easebuzzCheckStatus(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
    statusResponse(requestId: string, collectReq: CollectRequest): Promise<any>;
    statusResponsev2(requestId: string, collectReq: CollectRequest): Promise<any>;
    initiateRefund(collect_id: string, refund_amount: number, refund_id: string): Promise<any>;
    initiateRefundv2(collect_id: string, refund_amount: number, refund_id: string): Promise<any>;
    checkRefundSttaus(collect_id: string): Promise<any>;
    getQrBase64(collect_id: string): Promise<{
        intentUrl: string;
        qrCodeBase64: any;
        collect_id: string;
    } | undefined>;
    updateDispute(case_id: string, action: string, reason: string, documents: Array<{
        document_type: any;
        file_url: string;
    }>): Promise<any>;
    createOrderV2(request: CollectRequest, platform_charges: platformChange[], school_name: string): Promise<{
        collect_request_id: import("mongoose").Schema.Types.ObjectId;
        url: string;
    } | undefined>;
    createOrderV2NonSplit(request: CollectRequest, platform_charges: platformChange[], school_name: string, easebuzz_school_label?: string | null): Promise<{
        collect_request_id: import("mongoose").Schema.Types.ObjectId;
        collect_request_url: string;
    }>;
    getQr(collect_id: string, request: CollectRequest, ezb_split_payments: {
        [key: string]: number;
    }): Promise<void>;
    getQrNonSplit(collect_id: string, request: CollectRequest): Promise<void>;
    easebuzzCheckStatusV2(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
    statusResponseV2(requestId: string, collectReq: CollectRequest): Promise<any>;
    easebuzzWebhookCheckStatusV2(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
    createOrderNonseamless(request: CollectRequest, platform_charges: platformChange[], school_name: string): Promise<{
        collect_request_id: import("mongoose").Schema.Types.ObjectId;
        collect_request_url: string;
    } | undefined>;
    createOrderNonSplitNonSeamless(request: CollectRequest, platform_charges: platformChange[], school_name: string, easebuzz_school_label?: string | null): Promise<{
        collect_request_id: import("mongoose").Schema.Types.ObjectId;
        collect_request_url: string;
    }>;
    createOrderSeamlessNonSplit(request: CollectRequest): Promise<any>;
    createOrderSeamlessSplit(request: CollectRequest): Promise<any>;
}
