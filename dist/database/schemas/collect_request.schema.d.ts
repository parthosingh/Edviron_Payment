/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose/types/inferschematype" />
import { ObjectId } from 'mongoose';
export declare enum Gateway {
    PHONEPE = "PHONEPE",
    HDFC = "HDFC",
    EDVIRON_PG = "EDVIRON_PG",
    EDVIRON_PAY_U = "EDVIRON_PAY_U",
    EDVIRON_CCAVENUE = "EDVIRON_CCAVENUE",
    EDVIRON_CASHFREE = "EDVIRON_CASHFREE",
    EDVIRON_EASEBUZZ = "EDVIRON_EASEBUZZ",
    PENDING = "PENDING",
    EXPIRED = "EXPIRED",
    EDVIRON_HDFC_RAZORPAY = "EDVIRON_HDFC_RAZORPAY",
    SMART_GATEWAY = "EDVIRON_SMARTGATEWAY",
    PAYTM_POS = "PAYTM_POS",
    MOSAMBEE_POS = "MOSAMBEE_POS",
    EDVIRON_NTTDATA = "EDVIRON_NTTDATA",
    EDVIRON_WORLDLINE = "EDVIRON_WORLDLINE"
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
export declare class PaymentIds {
    cashfree_id?: string | null;
    easebuzz_id?: string | null;
    easebuzz_upi_id?: string | null;
    easebuzz_cc_id?: string | null;
    easebuzz_dc_id?: string | null;
    ccavenue_id?: string | null;
}
interface I_WORLDLINE {
    worldline_merchant_id: string;
    worldline_encryption_key: string;
    worldline_encryption_iV: string;
    worldline_token: string;
}
export declare class paytmPos {
    paytmMid?: string | null;
    paytmTid?: string | null;
    channel_id?: string | null;
    paytm_merchant_key?: string | null;
    device_id?: string | null;
}
export declare class CollectRequest {
    amount: number;
    createdAt?: Date;
    updatedAt?: Date;
    callbackUrl: string;
    gateway: Gateway;
    clientId: string;
    easebuzz_sub_merchant_id: string;
    clientSecret: string;
    webHookUrl: string;
    disabled_modes: string[];
    additional_data: string;
    school_id: string;
    trustee_id: string;
    payment_data: string;
    sdkPayment: boolean;
    isVBAPayment: boolean;
    isVBAPaymentComplete: boolean;
    custom_order_id: string;
    req_webhook_urls: string[];
    ccavenue_merchant_id: string;
    ccavenue_access_code: string;
    ccavenue_working_key: string;
    smartgateway_merchant_id: string;
    smartgateway_customer_id: string;
    smart_gateway_api_key: string;
    deepLink: string;
    paymentIds: PaymentIds;
    vendors_info?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ];
    worldline_vendors_info?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
            scheme_code?: string;
        }
    ];
    hdfc_razorpay_id: string;
    hdfc_razorpay_secret: string;
    hdfc_razorpay_payment_id: string;
    hdfc_razorpay_order_id: string;
    hdfc_razorpay_mid: string;
    isSplitPayments: boolean;
    isQRPayment: boolean;
    pay_u_key: string;
    pay_u_salt: string;
    pos_machine_name: string;
    pos_machine_device_id: string;
    pos_machine_device_code: string;
    isPosTransaction: boolean;
    paytmPos: paytmPos;
    ntt_data: I_NTT_DATA;
    worldline: I_WORLDLINE;
    worldline_token: string;
    vba_account_number: string;
    _id: ObjectId;
}
export type CollectRequestDocument = CollectRequest & Document;
export declare const CollectRequestSchema: import("mongoose").Schema<CollectRequest, import("mongoose").Model<CollectRequest, any, any, any, import("mongoose").Document<unknown, any, CollectRequest> & CollectRequest & Required<{
    _id: import("mongoose").Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CollectRequest, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CollectRequest>> & import("mongoose").FlatRecord<CollectRequest> & Required<{
    _id: import("mongoose").Schema.Types.ObjectId;
}>>;
export {};
