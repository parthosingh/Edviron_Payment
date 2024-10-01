import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';

export enum Gateway {
  PHONEPE = 'PHONEPE',
  HDFC = 'HDFC',
  EDVIRON_PG = 'EDVIRON_PG',
  EDVIRON_CCAVENUE='EDVIRON_CCAVENUE',
  EDVIRON_CASHFREE='EDVIRON_CASHFREE',
  EDVIRON_EASEBUZZ='EDVIRON_EASEBUZZ',
  PENDING='PENDING'
}


@Schema()
export class PaymentIds {
  @Prop({ type: String, required: false })
  cashfree_id?: string | null;

  @Prop({ type: String, required: false })
  easebuzz_id?: string | null;

  @Prop({ type: String, required: false })
  easebuzz_upi_id?: string | null;

  @Prop({ type: String, required: false })
  easebuzz_cc_id?: string | null;

  @Prop({ type: String, required: false })
  easebuzz_dc_id?: string | null;

  @Prop({ type: String, required: false })
  ccavenue_id?: string | null;
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
  easebuzz_sub_merchant_id: string;

  @Prop({ required: false })
  clientSecret: string;

  @Prop({ required: false })
  webHookUrl: string;

  @Prop({ required: true, default: [] })
  disabled_modes: string[];

  @Prop({ required: false, default: '' })
  additional_data: string;

  @Prop({ required: true })
  school_id: string;

  @Prop({ required: true })
  trustee_id: string;

  @Prop({ required: false })
  payment_data: string;

  @Prop({ required: false, default: false })
  sdkPayment: boolean;

  @Prop({ required: false, unique: true })
  custom_order_id: string;
  @Prop({ default: [] })
  req_webhook_urls: string[];

  @Prop({ required: false })
  ccavenue_merchant_id: string;

  @Prop({ required: false })
  ccavenue_access_code: string;

  @Prop({ required: false })
  ccavenue_working_key: string;

  @Prop({ required: false })
  deepLink: string;

  @Prop({ type: PaymentIds, required: false })
  paymentIds: PaymentIds;

  _id: ObjectId;
}

export type CollectRequestDocument = CollectRequest & Document;
export const CollectRequestSchema =
  SchemaFactory.createForClass(CollectRequest);
