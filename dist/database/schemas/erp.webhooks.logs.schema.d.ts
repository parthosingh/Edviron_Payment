import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';
export declare class ErpWebhooksLogs {
    collect_id: CollectRequest;
    createdAt?: Date;
    updatedAt?: Date;
    webhooktype: string;
    payload: string;
    response: string;
    status_code: string;
    isSuccess: boolean;
    trustee_id: string;
    school_id: string;
    webhook_url: string;
    triggered_time: String;
    _id: ObjectId;
}
export type ErpWebhooksLogsDocument = ErpWebhooksLogs & Document;
export declare const ErpWebhooksLogsSchema: mongoose.Schema<ErpWebhooksLogs, mongoose.Model<ErpWebhooksLogs, any, any, any, mongoose.Document<unknown, any, ErpWebhooksLogs> & ErpWebhooksLogs & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, ErpWebhooksLogs, mongoose.Document<unknown, {}, mongoose.FlatRecord<ErpWebhooksLogs>> & mongoose.FlatRecord<ErpWebhooksLogs> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
