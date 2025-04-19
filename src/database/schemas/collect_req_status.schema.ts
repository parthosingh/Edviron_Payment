import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  FAILURE = 'FAILURE',
  AUTO_REFUND = 'AUTO_REFUND',
  USER_DROPPED = 'USER_DROPPED',
}

interface error_details {
  error_description: string | null;
  error_reason: string | null;
  error_source: string | null;
}

@Schema({ timestamps: true })
export class CollectRequestStatus {
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({
    required: true,
    ref: 'CollectRequest',
    type: mongoose.Schema.Types.ObjectId,
  })
  collect_id: CollectRequest;

  @Prop({ required: true })
  status: String;

  @Prop({ required: true })
  order_amount: Number;

  @Prop({ required: true })
  transaction_amount: Number;

  @Prop({ required: false, default: '' })
  payment_method: String;

  @Prop({ required: false, default: '' })
  details: String;

  @Prop({ required: false, default: '' })
  status_details: String;

  @Prop({ required: false, default: '' })
  bank_reference: string;

  @Prop({ required: false, default: '' })
  payment_time: Date;

  @Prop({ required: false, default: false })
  isAttempted: boolean;

  @Prop({ required: false, default: false })
  isAutoRefund: boolean;

  @Prop({ required: false, default: '' })
  reason: string;

  @Prop({ required: false, default: '' })
  payment_message: string;

  @Prop({ required: false, default: '' })
  capture_status: string;

  @Prop({
    required: false,
    type: {
      error_description: { type: String, required: false, default: null },
      error_source: { type: String, required: false, default: null },
      error_reason: { type: String, required: false, default: null },
    },
    _id: false,
  })
  error_details: error_details;

  _id: ObjectId;
}

export type CollectRequestStatusDocument = CollectRequestStatus & Document;
export const CollectRequestStatusSchema =
  SchemaFactory.createForClass(CollectRequestStatus);
