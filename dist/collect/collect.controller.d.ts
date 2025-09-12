import { CollectService } from './collect.service';
import { DatabaseService } from 'src/database/database.service';
type RangeCharge = {
    upto: number;
    charge_type: string;
    charge: number;
};
export type platformChange = {
    platform_type: string;
    payment_mode: string;
    rangeCharge: RangeCharge[];
};
export declare class CollectController {
    private readonly collectService;
    private readonly databaseService;
    constructor(collectService: CollectService, databaseService: DatabaseService);
    collect(body: {
        amount: Number;
        callbackUrl: string;
        jwt: string;
        school_id: string;
        trustee_id: string;
        clientId?: string;
        clientSecret?: string;
        webHook?: string;
        disabled_modes?: string[];
        platform_charges: platformChange[];
        additional_data?: {};
        custom_order_id?: string;
        req_webhook_urls?: string[];
        school_name?: string;
        easebuzz_sub_merchant_id?: string;
        ccavenue_merchant_id?: string;
        ccavenue_access_code?: string;
        ccavenue_working_key?: string;
        smartgateway_merchant_id?: string | null;
        smartgateway_customer_id?: string | null;
        smart_gateway_api_key?: string | null;
        split_payments?: boolean;
        pay_u_key?: string | null;
        pay_u_salt: string | null;
        hdfc_razorpay_id?: string;
        hdfc_razorpay_secret?: string;
        isVBAPayment: boolean;
        vba_account_number: string;
        hdfc_razorpay_mid?: string;
        nttdata_id?: string | null;
        nttdata_secret?: string | null;
        nttdata_hash_req_key?: string | null;
        nttdata_hash_res_key?: string | null;
        nttdata_res_salt?: string | null;
        nttdata_req_salt?: string | null;
        easebuzz_school_label?: string | null;
        worldline_merchant_id?: string | null;
        worldline_encryption_key?: string | null;
        worldline_encryption_iV?: string | null;
        worldline_scheme_code?: string | null;
        isCFNonSeamless?: boolean;
        razorpay_credentials?: {
            razorpay_id?: string | null;
            razorpay_secret?: string | null;
            razorpay_mid?: string | null;
        };
        gatepay_credentials?: {
            gatepay_mid?: string | null;
            gatepay_terminal_id?: string | null;
            gatepay_key?: string | null;
            gatepay_iv?: string | null;
        };
        razorpay_seamless_credentials?: {
            razorpay_id?: string | null;
            razorpay_secret?: string | null;
            razorpay_mid?: string | null;
        };
        vendors_info?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
                scheme_code?: string;
            }
        ];
        worldLine_vendors?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
                scheme_code?: string;
            }
        ];
        vendorgateway?: {
            easebuzz: boolean;
            cashfree: boolean;
        };
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
        razorpay_vendors?: [
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
            }
        ];
        isEasebuzzNonpartner?: boolean;
        easebuzz_non_partner_cred?: {
            easebuzz_salt: string;
            easebuzz_key: string;
            easebuzz_merchant_email: string;
            easebuzz_submerchant_id: string;
        };
        isSelectGateway?: boolean;
        razorpay_partner?: boolean;
    }): Promise<any>;
    posCollect(body: {
        amount: Number;
        callbackUrl: string;
        jwt: string;
        school_id: string;
        trustee_id: string;
        machine_name?: string;
        platform_charges?: platformChange[];
        paytm_pos?: {
            paytmMid?: string;
            paytmTid?: string;
            channel_id?: string;
            paytm_merchant_key?: string;
            device_id?: string;
        };
        additional_data?: {};
        custom_order_id?: string;
        req_webhook_urls?: string[];
        school_name?: string;
    }): Promise<any>;
    callbackUrl(res: any, collect_id: string): Promise<void>;
}
export {};
