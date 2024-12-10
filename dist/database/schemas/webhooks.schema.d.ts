import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';
export declare class Webhooks {
    collect_id: CollectRequest;
    createdAt?: Date;
    updatedAt?: Date;
    type: string;
    body: string;
    _id: ObjectId;
}
export type WebhooksDocument = Webhooks & Document;
export declare const WebhooksSchema: mongoose.Schema<Webhooks, mongoose.Model<Webhooks, any, any, any, mongoose.Document<unknown, any, Webhooks> & Webhooks & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Webhooks, mongoose.Document<unknown, {}, mongoose.FlatRecord<Webhooks>> & mongoose.FlatRecord<Webhooks> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
