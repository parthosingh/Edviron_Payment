import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest, Gateway } from './collect_request.schema';

@Schema({ timestamps: true })
export class VendorTransaction {
  @Prop({ required: true })
  amount: number;

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

  @Prop({ required: true, default: Gateway.PHONEPE })
  gateway: Gateway;

  @Prop({ required: false })
  status: string;

  @Prop({ required: false })
  vendor_id: string;

  @Prop({ required: false })
  school_id: string;

  @Prop({ required: false })
  trustee_id: string;

  @Prop({ required: false })
  custom_order_id: string;

  @Prop({ required: false })
  name: string;

  @Prop({ required: false, default: '' })
  payment_time: Date;

  @Prop({
    required: false,
    type: [
      {
        vendor_id: { type: String, required: true },
        account: { type: String, required: false },
        percentage: { type: Number, required: false },
        amount: { type: Number, required: false },
        notes: {
          type: {
            branch: { type: String, required: false },
            name: { type: String, required: false },
          },
          required: false,
        },
        linked_account_notes: { type: [String], required: false },
        on_hold: { type: Boolean, required: false },
        on_hold_until: { type: Date, required: false },
      },
    ],
  })
  razorpay_vendors?: Array<{
    vendor_id: string;
    account?: string;
    percentage?: number;
    amount?: number;
    notes?: {
      branch?: string;
      name?: string;
    };
    linked_account_notes?: string[];
    on_hold?: boolean;
    on_hold_until?: Date;
  }>;

  _id: ObjectId;
}

export type VendorTransactionDocument = VendorTransaction & Document;
export const VendorTransactionSchema =
  SchemaFactory.createForClass(VendorTransaction);
