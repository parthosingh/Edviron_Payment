import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';

export enum Gateway {
  PHONEPE = 'PHONEPE',
  HDFC = 'HDFC',
  EDVIRON_PG = 'EDVIRON_PG',
  EDVIRON_PAY_U = 'EDVIRON_PAY_U',
  EDVIRON_CCAVENUE='EDVIRON_CCAVENUE',
  EDVIRON_CASHFREE='EDVIRON_CASHFREE',
  EDVIRON_EASEBUZZ='EDVIRON_EASEBUZZ',
  PENDING='PENDING',
  EXPIRED='EXPIRED',
  EDVIRON_HDFC_RAZORPAY = 'EDVIRON_HDFC_RAZORPAY',
  EDVIRON_NTTDATA = 'EDVIRON_NTTDATA',
}

interface I_NTT_DATA {
  nttdata_id: string;
  nttdata_secret: string;
  ntt_atom_token: string;
  ntt_atom_txn_id: string;
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

  @Prop({ required: false })
  vendors_info?: [
    { vendor_id: string; percentage?: number; amount?: number; name?: string },
  ];

  @Prop({ required: false })
  hdfc_razorpay_id: string;

  @Prop({ required: false })
  hdfc_razorpay_secret: string;

  @Prop({ required: false })
  hdfc_razorpay_payment_id: string;

  @Prop({ required: false })
  hdfc_razorpay_order_id: string;

  @Prop({ required: false })
  hdfc_razorpay_mid: string;

  @Prop({ required: false, default: false })
  isSplitPayments: boolean;

  @Prop({ required: false, default: false })
  isQRPayment: boolean;

  @Prop({ required: false })
  pay_u_key: string;

  @Prop({ required: false })
  pay_u_salt: string;

  @Prop({
    required: false,
    type: {
      nttdata_id: { type: String, required: false, default: null },
      nttdata_secret: { type: String, required: false, default: null },
      ntt_atom_token: { type: String, required: false, default: null },
      ntt_atom_txn_id: { type: String, required: false, default: null },
    },
    _id: false,
  })
  ntt_data: I_NTT_DATA;

  _id: ObjectId;
}

export type CollectRequestDocument = CollectRequest & Document;
export const CollectRequestSchema =
  SchemaFactory.createForClass(CollectRequest);
