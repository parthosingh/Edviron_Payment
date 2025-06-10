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

interface I_WORLDLINE {
  worldline_merchant_id: string;
  worldline_encryption_key: string;
  worldline_encryption_iV: string;
  worldline_token: string;
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
    { vendor_id: string; percentage?: number; amount?: number; name?: string },
  ];

  @Prop({ required: false })
  easebuzzVendors?: [
    { vendor_id: string; percentage?: number; amount?: number; name?: string },
  ];

  @Prop({ required: false })
  cashfreeVedors?: [
    { vendor_id: string; percentage?: number; amount?: number; name?: string },
  ];

  worldline_vendors_info?: [
    { vendor_id: string; percentage?: number; amount?: number; name?: string, scheme_code?: string },
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

  @Prop({required:false})
  easebuzz_split_label:string

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
      worldline_merchant_id: { type: String, required: false, default: null },
      worldline_encryption_key: { type: String, required: false, default: null },
      worldline_encryption_iV: { type: String, required: false, default: null },
      worldline_token: { type: String, required: false, default: null },
    },
    _id: false,
  })
  worldline : I_WORLDLINE

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

  _id: ObjectId;
}

export type CollectRequestDocument = CollectRequest & Document;
export const CollectRequestSchema =
  SchemaFactory.createForClass(CollectRequest);

const dummy = {
  head: {
    responseTimestamp: '2025-06-0514:40:00',
    checksum:
      'c+g5rJCMNSsllk0VH5ZLdP/q52RH+B7Ly74EADiiSWekJtTwt2ad6MPbdyl4PbNpSpQR8GXz8/cLBas3x/Wfc2E9YrIUxlmdL3yG7D7loRw=',
  },
  body: {
    paytmMid: 'yYLgEx27583498804201',
    paytmTid: '70001853',
    transactionDateTime: '2025-06-05 14:39:11',
    merchantTransactionId: '68415eb7914304377e758613',
    merchantReferenceNo: '68415eb7914304377e758613',
    transactionAmount: '100',
    acquirementId: '20250605011610000137394427929951634',
    retrievalReferenceNo: '174911457722',
    authCode: null,
    issuerMaskCardNo: null,
    issuingBankName: null,
    bankResponseCode: '0',
    bankResponseMessage: 'NA',
    bankMid: 'yYLgEx27583498804201',
    bankTid: null,
    merchantExtendedInfo: null,
    extendedInfo: null,
    acquiringBank: 'RBL Bank',
    resultInfo: {
      resultStatus: 'SUCCESS',
      resultCode: 'S',
      resultMsg: 'Success',
      resultCodeId: '0000',
    },
  },
};
