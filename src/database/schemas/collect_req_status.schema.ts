import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
  PENDING = 'PENDING',
}

@Schema({ timestamps: true })
export class CollectRequestStatus {
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({ required: true })
  collect_id: string;

  @Prop({ required: true })
  status: PaymentStatus;

  @Prop({ required: true })
  order_amount: Number;

  @Prop({ required: true })
  transaction_amount: Number;

  @Prop({ required: false, default: '' })
  payment_method: String;

  _id: ObjectId;
}

export type CollectRequestStatusDocument = CollectRequestStatus & Document;
export const CollectRequestStatusSchema =
  SchemaFactory.createForClass(CollectRequestStatus);
