import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';

@Schema({ timestamps: true })
export class Webhooks {
  @Prop({ required: true })
  collect_id: string;

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
