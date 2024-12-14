import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

@Schema({ timestamps: true })
export class ErpWebhooksLogs {
  @Prop({
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
 
  @Prop({ required: true })
  payload: string;

  @Prop({ required: false })
  response: string;

  @Prop({ required: false })
  status_code: string;

  @Prop({ required: false })
  isSuccess: boolean;

  @Prop({ required: false })
  trustee_id: string;

  @Prop({ required: false })
  school_id: string;

  @Prop({ required: false })
  webhook_url: string;

  @Prop({ required: false })
  triggered_time: String;

  _id: ObjectId;
}

export type ErpWebhooksLogsDocument = ErpWebhooksLogs & Document;
export const ErpWebhooksLogsSchema = SchemaFactory.createForClass(ErpWebhooksLogs);
