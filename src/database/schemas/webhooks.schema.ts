import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

export enum WebhookSource {
  Cashfree = 'Cashfree',
  Easebuzz = 'Easebuzz',
  Razorpay = 'Razorpay',
}

interface Cashfree_Webhook_Header {
  'x-webhook-signature': string;
  'x-webhook-timestamp': string;
}

type Webhook_Header =
  | {
      source: WebhookSource.Cashfree;
      headers: Cashfree_Webhook_Header;
    }
  | {
      source: WebhookSource.Easebuzz;
      headers: Record<string, string>;
    };

@Schema({ timestamps: true })
export class Webhooks {
  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectRequest',
  })
  collect_id: CollectRequest;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({ required: false })
  webhooktype: string;

  @Prop({ required: false })
  gateway: string;

  @Prop({ required: true })
  body: string;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  webhook_header?: Webhook_Header;

  _id: ObjectId;
}

export type WebhooksDocument = Webhooks & Document;
export const WebhooksSchema = SchemaFactory.createForClass(Webhooks);
