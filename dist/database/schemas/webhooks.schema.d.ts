import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';
export declare enum WebhookSource {
    Cashfree = "Cashfree",
    Easebuzz = "Easebuzz",
    Razorpay = "Razorpay"
}
interface Cashfree_Webhook_Header {
    'x-webhook-signature': string;
    'x-webhook-timestamp': string;
}
type Webhook_Header = {
    source: WebhookSource.Cashfree;
    headers: Cashfree_Webhook_Header;
} | {
    source: WebhookSource.Easebuzz;
    headers: Record<string, string>;
};
export declare class Webhooks {
    collect_id: CollectRequest;
    createdAt?: Date;
    updatedAt?: Date;
    webhooktype: string;
    body: string;
    webhook_header?: Webhook_Header;
    _id: ObjectId;
}
export type WebhooksDocument = Webhooks & Document;
export declare const WebhooksSchema: mongoose.Schema<Webhooks, mongoose.Model<Webhooks, any, any, any, mongoose.Document<unknown, any, Webhooks> & Webhooks & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Webhooks, mongoose.Document<unknown, {}, mongoose.FlatRecord<Webhooks>> & mongoose.FlatRecord<Webhooks> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
export {};
