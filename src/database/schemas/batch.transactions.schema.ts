import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

@Schema({ timestamps: true })
export class BatchTransactions {
  @Prop({ nullable: true })
  trustee_id: string;
  @Prop({ nullable: true })
  school_id: string;
  @Prop({})
  total_order_amount: Number;

  @Prop({})
  total_transaction_amount: Number;

  @Prop({})
  total_transactions: Number;

  @Prop({})
  month: string;

  @Prop({})
  year: string;

  @Prop()
  updatedAt?: Date;

  @Prop({})
  status: string;

  _id: ObjectId;
}

export type BatchTransactionsDocument = BatchTransactions & Document;
export const BatchTransactionsSchema =
  SchemaFactory.createForClass(BatchTransactions);
