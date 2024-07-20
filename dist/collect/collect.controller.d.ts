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
        clientId: string;
        clientSecret: string;
        school_id: string;
        trustee_id: string;
        webHook?: string;
        disabled_modes?: string[];
        platform_charges: platformChange[];
        additional_data?: {};
        custom_order_id?: string;
        req_webhook_urls?: string[];
        school_name?: string;
        easebuzz_sub_merchant_id?: string;
    }): Promise<any>;
    callbackUrl(res: any, collect_id: string): Promise<void>;
}
export {};
