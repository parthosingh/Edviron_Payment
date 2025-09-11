import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';

export enum Gateway {
  PHONEPE = 'PHONEPE',
  HDFC = 'HDFC',
  EDVIRON_PG = 'EDVIRON_PG',
  EDVIRON_PAY_U = 'EDVIRON_PAY_U',
  EDVIRON_CCAVENUE = 'EDVIRON_CCAVENUE',
  EDVIRON_CASHFREE = 'EDVIRON_CASHFREE',
  EDVIRON_EASEBUZZ = 'EDVIRON_EASEBUZZ',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  EDVIRON_HDFC_RAZORPAY = 'EDVIRON_HDFC_RAZORPAY',
  SMART_GATEWAY = 'EDVIRON_SMARTGATEWAY',
  PAYTM_POS = 'PAYTM_POS',
  MOSAMBEE_POS = 'MOSAMBEE_POS',
  EDVIRON_NTTDATA = 'EDVIRON_NTTDATA',
  EDVIRON_WORLDLINE = 'EDVIRON_WORLDLINE',
  EDVIRON_RAZORPAY = 'EDVIRON_RAZORPAY',
  EDVIRON_GATEPAY = 'EDVIRON_GATEPAY',
}

interface I_NTT_DATA {
  nttdata_id: string;
  nttdata_secret: string;
  ntt_atom_token: string;
  ntt_atom_txn_id: string;
  nttdata_hash_req_key: string;
  nttdata_req_salt: string;
  nttdata_hash_res_key: string;
  nttdata_res_salt: string;
}

interface I_Razorpay {
  razorpay_id: string;
  razorpay_secret: string;
  razorpay_mid: string;
  order_id: string;
  payment_id: string;
  razorpay_signature: string;
}

export interface Non_Seamless_Payment_Links {
  cashfree: string;
  easebuzz: string;
  razorpay: string;
  ccavenue: string;
  pay_u: string;
  worldline: string;
  gatepay: string;
  nttdata: string;
  hdfc_razorpay: string;
  hdfc_smartgateway: string;
  edviron_pg: string;

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

  @Prop({ type: String, required: false })
  razorpay_order_id?: string | null;
}

interface I_WORLDLINE {
  worldline_merchant_id: string;
  worldline_encryption_key: string;
  worldline_encryption_iV: string;
  worldline_token: string;
  worldline_scheme_code: string;
}

interface I_Gatepay {
  gatepay_mid: string;
  gatepay_terminal_id: string;
  gatepay_key: string;
  gatepay_iv: string;
  txnId: string;
  token: string;
  paymentUrl?: string;
}

interface EASEBUZZ_NON_PARTNER_CRED {
  easebuzz_salt: string;
  easebuzz_key: string;
  easebuzz_merchant_email: string;
  easebuzz_submerchant_id: string;
}

interface CASHFREE_CREDENTIALS {
  cf_x_client_id: string;
  cf_x_client_secret: string;
  cf_api_key: string;
}

@Schema()
export class paytmPos {
  @Prop({ type: String, required: false })
  paytmMid?: string | null;

  @Prop({ type: String, required: false })
  paytmTid?: string | null;

  @Prop({ type: String, required: false })
  channel_id?: string | null;

  @Prop({ type: String, required: false })
  paytm_merchant_key?: string | null;

  @Prop({ type: String, required: false })
  device_id?: string | null;
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
  payment_id: string;

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

  @Prop({ required: false, default: false })
  isCFNonSeamless: boolean;

  @Prop({ required: false, default: false })
  isVBAPayment: boolean;

  @Prop({ required: false, default: false })
  isVBAPaymentComplete: boolean;

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
  smartgateway_merchant_id: string;

  @Prop({ required: false })
  smartgateway_customer_id: string;

  @Prop({ required: false })
  smart_gateway_api_key: string;

  @Prop({ required: false })
  deepLink: string;

  @Prop({ type: PaymentIds, required: false })
  paymentIds: PaymentIds;

  @Prop({ required: false })
  vendors_info?: [
    { vendor_id: string; edv_vendor_id?: string; percentage?: number; amount?: number; name?: string },
  ];

  @Prop({ required: false })
  easebuzzVendors?: [
    { vendor_id: string; percentage?: number; amount?: number; name?: string },
  ];

  @Prop({ required: false })
  cashfreeVedors?: [
    { vendor_id: string; percentage?: number; amount?: number; name?: string },
  ];

  @Prop({ required: false })
  worldline_vendors_info?: [
    {
      vendor_id: string;
      percentage?: number;
      amount?: number;
      name?: string;
      scheme_code?: string;
    },
  ];

  @Prop({ required: false })
  razorpay_vendors_info?: [
    {
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
    },
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

  @Prop({ required: false })
  easebuzz_split_label: string;

  @Prop({ required: false })
  pos_machine_name: string;

  @Prop({ required: false })
  pos_machine_device_id: string;

  @Prop({ required: false })
  pos_machine_device_code: string;

  @Prop({ required: false, default: false })
  isPosTransaction: boolean;

  @Prop({ type: paytmPos, required: false })
  paytmPos: paytmPos;

  @Prop({
    required: false,
    type: {
      nttdata_id: { type: String, required: false, default: null },
      nttdata_secret: { type: String, required: false, default: null },
      ntt_atom_token: { type: String, required: false, default: null },
      ntt_atom_txn_id: { type: String, required: false, default: null },
      nttdata_hash_req_key: { type: String, required: false, default: null },
      nttdata_req_salt: { type: String, required: false, default: null },
      nttdata_hash_res_key: { type: String, required: false, default: null },
      nttdata_res_salt: { type: String, required: false, default: null },
    },
    _id: false,
  })
  ntt_data: I_NTT_DATA;

  @Prop({
    required: false,
    type: {
      cf_x_client_id: { type: String, required: false, default: null },
      cf_x_client_secret: { type: String, required: false, default: null },
      cf_api_key: { type: String, required: false, default: null },
    },
    _id: false,
  })
  cashfree_credentials: CASHFREE_CREDENTIALS;

  @Prop({
    required: false,
    type: {
      worldline_merchant_id: { type: String, required: false, default: null },
      worldline_encryption_key: {
        type: String,
        required: false,
        default: null,
      },
      worldline_encryption_iV: { type: String, required: false, default: null },
      worldline_token: { type: String, required: false, default: null },
      worldline_scheme_code: { type: String, required: false, default: null },
    },
    _id: false,
  })
  worldline: I_WORLDLINE;

  @Prop({
    required: false,
    type: {
      gatepay_mid: { type: String, required: false, default: null },
      gatepay_key: {
        type: String,
        required: false,
        default: null,
      },
      gatepay_terminal_id: { type: String, required: false, default: null },
      gatepay_iv: { type: String, required: false, default: null },
      paymentUrl: { type: String, required: false, default: null },
      txnId: { type: String, required: false, default: null },
      token: { type: String, required: false, default: null },
    },
    _id: false,
  })
  gatepay: I_Gatepay;

  @Prop({ 
    required: false,
    type: {
      cashfree:{ type: String, required: false, default: null },
      easebuzz:{ type: String, required: false, default: null },
      razorpay:{ type: String, required: false, default: null },
      ccavenue:{ type: String, required: false, default: null },
      pay_u:{ type: String, required: false, default: null },
      worldline:{ type: String, required: false, default: null },
      gatepay:{ type: String, required: false, default: null },
      nttdata:{ type: String, required: false, default: null },
      hdfc_razorpay:{ type: String, required: false, default: null },
      hdfc_smartgateway:{ type: String, required: false, default: null },
      edviron_pg:{ type: String, required: false, default: null },
    },
    _id: false
  })
  non_seamless_payment_links: Non_Seamless_Payment_Links;

  @Prop({
    required: false,
    type: {
      easebuzz_salt: { type: String, required: false, default: null },
      easebuzz_key: {
        type: String,
        required: false,
        default: null,
      },
      easebuzz_merchant_email: { type: String, required: false, default: null },
      easebuzz_submerchant_id: { type: String, required: false, default: null },
    },
    _id: false,
  })
  easebuzz_non_partner_cred: EASEBUZZ_NON_PARTNER_CRED;

  @Prop({ required: false, default: false })
  easebuzz_non_partner: boolean;

  @Prop({ required: false, default: false })
  cashfree_non_partner: boolean;

   @Prop({ required: false, default: false })
  isMasterGateway: boolean;

  // @Prop({ required: false })
  // worldline_merchant_id: string;

  // @Prop({ required: false })
  // worldline_encryption_key: string;

  // @Prop({ required: false })
  // worldline_encryption_iV: string;

  // @Prop({ required: false })
  // worldline_scheme_code: string[];

  @Prop({ required: false })
  worldline_token: string;

  @Prop({ required: false })
  vba_account_number: string;

  @Prop({
    required: false,
    type: {
      razorpay_id: { type: String, required: false, default: null },
      razorpay_secret: { type: String, required: false, default: null },
      razorpay_mid: { type: String, required: false, default: null },
      order_id: { type: String, required: false, default: null },
      payment_id: { type: String, required: false, default: null },
      razorpay_signature: { type: String, required: false, default: null },
    },
    _id: false,
  })
  razorpay: I_Razorpay;

  @Prop({
    required: false,
    type: {
      razorpay_id: { type: String, required: false, default: null },
      razorpay_secret: { type: String, required: false, default: null },
      razorpay_mid: { type: String, required: false, default: null },
      order_id: { type: String, required: false, default: null },
      payment_id: { type: String, required: false, default: null },
      razorpay_signature: { type: String, required: false, default: null },
    },
    _id: false,
  })
  razorpay_seamless: I_Razorpay;

  _id: ObjectId;
}

export type CollectRequestDocument = CollectRequest & Document;
export const CollectRequestSchema =
  SchemaFactory.createForClass(CollectRequest);
