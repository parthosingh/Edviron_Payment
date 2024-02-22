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
export declare class Webhooks {
    collect_id: string;
    createdAt?: Date;
    updatedAt?: Date;
    body: string;
    _id: ObjectId;
}
export type WebhooksDocument = Webhooks & Document;
export declare const WebhooksSchema: import("mongoose").Schema<Webhooks, import("mongoose").Model<Webhooks, any, any, any, import("mongoose").Document<unknown, any, Webhooks> & Webhooks & Required<{
    _id: import("mongoose").Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Webhooks, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Webhooks>> & import("mongoose").FlatRecord<Webhooks> & Required<{
    _id: import("mongoose").Schema.Types.ObjectId;
}>>;
