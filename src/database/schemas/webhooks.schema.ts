import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

@Schema({ timestamps: true })
export class Webhooks {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectRequest',
  })
  collect_id: CollectRequest;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({ required: true })
  body: string;

  _id: ObjectId;
}

export type WebhooksDocument = Webhooks & Document;
export const WebhooksSchema = SchemaFactory.createForClass(Webhooks);
