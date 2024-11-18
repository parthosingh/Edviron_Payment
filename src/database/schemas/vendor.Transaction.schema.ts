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

  @Prop({ required: false})
  vendor_id: string;

  @Prop({ required: false})
  school_id: string;

  @Prop({ required: false})
  trustee_id: string;

  @Prop({ required: false})
  custom_order_id: string;

  @Prop({ required: false})
  name: string;

  _id: ObjectId;
}

export type VendorTransactionDocument = VendorTransaction & Document;
export const VendorTransactionSchema =
  SchemaFactory.createForClass(VendorTransaction);