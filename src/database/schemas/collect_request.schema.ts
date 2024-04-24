import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';

export enum Gateway {
  PHONEPE = 'PHONEPE',
  HDFC = 'HDFC',
  EDVIRON_PG = 'EDVIRON_PG',
}

@Schema({ timestamps: true })
export class CollectRequest {
  @Prop({ required: true })
  amount: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({ required: true })
  callbackUrl: string;

  @Prop({ required: true, default: Gateway.PHONEPE })
  gateway: Gateway;

  @Prop({ required: false })
  clientId: string;

  @Prop({ required: false })
  clientSecret: string;

  @Prop({ required: false })
  webHookUrl: string;

  @Prop({ required: true, default: [] })
  disabled_modes: string[];

  @Prop({ required: false, default: '' })
  student_name: string;

  @Prop({ required: false, default: '' })
  student_phone: string;

  @Prop({ required: false, default: '' })
  student_email: string;

  @Prop({ required: false, default: '' })
  student_id: string;

  @Prop({ required: false, default: '' })
  receipt: string;

  @Prop({ required: false, default: '' })
  additional_data: string;

  @Prop({ required: true })
  school_id: string;

  @Prop({ required: true })
  trustee_id: string;

  _id: ObjectId;
}

export type CollectRequestDocument = CollectRequest & Document;
export const CollectRequestSchema =
  SchemaFactory.createForClass(CollectRequest);
