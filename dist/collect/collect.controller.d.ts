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
        hdfc_razorpay_mid?: string;
        vendors_info?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
            }
        ];
    }): Promise<any>;
    posCollect(body: {
        amount: Number;
        callbackUrl: string;
        jwt: string;
        school_id: string;
        trustee_id: string;
        platform_charges: string;
        split_payments?: boolean;
        machine_name: string;
        posmachinedevice_id: string;
        posmachine_device_code: string;
        additional_data?: Record<string, any>;
        school_name?: string;
        vendors_info?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
            }
        ];
    }): Promise<any>;
    callbackUrl(res: any, collect_id: string): Promise<void>;
}
export {};
