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
    EDVIRON_WORLDLINE = "EDVIRON_WORLDLINE",
    EDVIRON_RAZORPAY = "EDVIRON_RAZORPAY",
    EDVIRON_RAZORPAY_SEAMLESS = "EDVIRON_RAZORPAY_SEAMLESS",
    EDVIRON_GATEPAY = "EDVIRON_GATEPAY"
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
export interface I_Razorpay {
    razorpay_id: string;
    razorpay_secret: string;
    razorpay_mid: string;
    order_id: string;
    payment_id: string;
    razorpay_signature: string;
}
export interface Non_Seamless_Payment_Links {
    cashfree: string | null;
    easebuzz: string | null;
    edv_easebuzz: string | null;
    razorpay: string | null;
    ccavenue: string | null;
    pay_u: string | null;
    worldline: string | null;
    gatepay: string | null;
    nttdata: string | null;
    hdfc_razorpay: string | null;
    hdfc_smartgateway: string | null;
    edviron_pg: string | null;
}
export declare class PaymentIds {
    cashfree_id?: string | null;
    easebuzz_id?: string | null;
    easebuzz_upi_id?: string | null;
    easebuzz_cc_id?: string | null;
    easebuzz_dc_id?: string | null;
    ccavenue_id?: string | null;
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
export declare enum CurrencyCode {
    AFN = "AFN",
    ALL = "ALL",
    DZD = "DZD",
    AOA = "AOA",
    ARS = "ARS",
    AMD = "AMD",
    AWG = "AWG",
    AUD = "AUD",
    AZN = "AZN",
    BSD = "BSD",
    BHD = "BHD",
    BDT = "BDT",
    BBD = "BBD",
    BZD = "BZD",
    BMD = "BMD",
    BTN = "BTN",
    BOB = "BOB",
    BAM = "BAM",
    BWP = "BWP",
    BRL = "BRL",
    BND = "BND",
    BGN = "BGN",
    BIF = "BIF",
    KHR = "KHR",
    CAD = "CAD",
    CVE = "CVE",
    KYD = "KYD",
    XAF = "XAF",
    XPF = "XPF",
    CLP = "CLP",
    COP = "COP",
    KMF = "KMF",
    CDF = "CDF",
    CRC = "CRC",
    CZK = "CZK",
    DKK = "DKK",
    DJF = "DJF",
    DOP = "DOP",
    XCD = "XCD",
    EGP = "EGP",
    ERN = "ERN",
    SZL = "SZL",
    ETB = "ETB",
    EUR = "EUR",
    FKP = "FKP",
    FJD = "FJD",
    GMD = "GMD",
    GEL = "GEL",
    GHS = "GHS",
    GIP = "GIP",
    GTQ = "GTQ",
    GNF = "GNF",
    GYD = "GYD",
    HTG = "HTG",
    HNL = "HNL",
    HKD = "HKD",
    HUF = "HUF",
    ISK = "ISK",
    INR = "INR",
    IDR = "IDR",
    IQD = "IQD",
    JMD = "JMD",
    JPY = "JPY",
    JOD = "JOD",
    KZT = "KZT",
    KES = "KES",
    KWD = "KWD",
    KGS = "KGS",
    LAK = "LAK",
    LBP = "LBP",
    LRD = "LRD",
    LYD = "LYD",
    MOP = "MOP",
    MKD = "MKD",
    MGA = "MGA",
    MWK = "MWK",
    MYR = "MYR",
    MVR = "MVR",
    MRU = "MRU",
    MUR = "MUR",
    MXN = "MXN",
    MDL = "MDL",
    MNT = "MNT",
    MAD = "MAD",
    MZN = "MZN",
    NAD = "NAD",
    NPR = "NPR",
    ILS = "ILS",
    TWD = "TWD",
    NZD = "NZD",
    NIO = "NIO",
    NGN = "NGN",
    NOK = "NOK",
    PGK = "PGK",
    PYG = "PYG",
    PEN = "PEN",
    PHP = "PHP",
    PLN = "PLN",
    GBP = "GBP",
    QAR = "QAR",
    CNY = "CNY",
    OMR = "OMR",
    RON = "RON",
    RUB = "RUB",
    RWF = "RWF",
    SHP = "SHP",
    WST = "WST",
    SAR = "SAR",
    RSD = "RSD",
    SCR = "SCR",
    SLL = "SLL",
    SGD = "SGD",
    SBD = "SBD",
    SOS = "SOS",
    ZAR = "ZAR",
    KRW = "KRW",
    LKR = "LKR",
    SRD = "SRD",
    SEK = "SEK",
    CHF = "CHF",
    TJS = "TJS",
    TZS = "TZS",
    THB = "THB",
    TOP = "TOP",
    TTD = "TTD",
    TND = "TND",
    TRY = "TRY",
    TMT = "TMT",
    AED = "AED",
    UGX = "UGX",
    UAH = "UAH",
    UYU = "UYU",
    USD = "USD",
    UZS = "UZS",
    VUV = "VUV",
    VND = "VND",
    XOF = "XOF",
    YER = "YER",
    ZMW = "ZMW"
}
interface CASHFREE_CREDENTIALS {
    cf_x_client_id: string;
    cf_x_client_secret: string;
    cf_api_key: string;
}
export declare class RazorpayVendorInfo {
    vendor_id: string;
    edv_vendor_id: string;
    account?: string;
    percentage?: number;
    amount?: number;
    name?: string;
    notes?: {
        branch?: string;
        name?: string;
    };
    linked_account_notes?: string[];
    on_hold?: boolean;
    on_hold_until?: Date;
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
    currency: CurrencyCode;
    clientId: string;
    easebuzz_sub_merchant_id: string;
    clientSecret: string;
    payment_id: string;
    webHookUrl: string;
    disabled_modes: string[];
    additional_data: string;
    school_id: string;
    trustee_id: string;
    payment_data: string;
    sdkPayment: boolean;
    isCFNonSeamless: boolean;
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
            edv_vendor_id?: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ];
    easebuzzVendors?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ];
    cashfreeVedors?: [
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
    razorpay_vendors_info?: [
        {
            vendor_id: string;
            edv_vendor_id: string;
            account?: string;
            percentage?: number;
            amount?: number;
            name?: string;
            notes?: {
                branch?: string;
                name?: string;
            };
            linked_account_notes?: string[];
            on_hold?: boolean;
            on_hold_until?: Date;
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
    easebuzz_split_label: string;
    pos_machine_name: string;
    pos_machine_device_id: string;
    pos_machine_device_code: string;
    isPosTransaction: boolean;
    paytmPos: paytmPos;
    ntt_data: I_NTT_DATA;
    cashfree_credentials: CASHFREE_CREDENTIALS;
    worldline: I_WORLDLINE;
    gatepay: I_Gatepay;
    non_seamless_payment_links: Non_Seamless_Payment_Links;
    easebuzz_non_partner_cred: EASEBUZZ_NON_PARTNER_CRED;
    easebuzz_non_partner: boolean;
    cashfree_non_partner: boolean;
    isMasterGateway: boolean;
    razorpay_partner: boolean;
    worldline_token: string;
    vba_account_number: string;
    razorpay: I_Razorpay;
    razorpay_seamless: I_Razorpay;
    _id: ObjectId;
}
export type CollectRequestDocument = CollectRequest & Document;
export declare const CollectRequestSchema: import("mongoose").Schema<CollectRequest, import("mongoose").Model<CollectRequest, any, any, any, import("mongoose").Document<unknown, any, CollectRequest> & CollectRequest & Required<{
    _id: import("mongoose").Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CollectRequest, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CollectRequest>> & import("mongoose").FlatRecord<CollectRequest> & Required<{
    _id: import("mongoose").Schema.Types.ObjectId;
}>>;
export {};
