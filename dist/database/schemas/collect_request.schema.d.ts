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
/// <reference types="mongoose/types/inferschematype" />
import { ObjectId } from 'mongoose';
export declare enum Gateway {
    PHONEPE = "PHONEPE",
    HDFC = "HDFC",
    EDVIRON_PG = "EDVIRON_PG"
}
export declare class CollectRequest {
    amount: number;
    createdAt?: Date;
    updatedAt?: Date;
    callbackUrl: string;
    gateway: Gateway;
    clientId: string;
    clientSecret: string;
    webHookUrl: string;
    disabled_modes: string[];
    student_name: string;
    student_phone: string;
    student_email: string;
    student_id: string;
    receipt: string;
    additional_data: string;
    school_id: string;
    trustee_id: string;
    _id: ObjectId;
}
export type CollectRequestDocument = CollectRequest & Document;
export declare const CollectRequestSchema: import("mongoose").Schema<CollectRequest, import("mongoose").Model<CollectRequest, any, any, any, import("mongoose").Document<unknown, any, CollectRequest> & CollectRequest & Required<{
    _id: import("mongoose").Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CollectRequest, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CollectRequest>> & import("mongoose").FlatRecord<CollectRequest> & Required<{
    _id: import("mongoose").Schema.Types.ObjectId;
}>>;
