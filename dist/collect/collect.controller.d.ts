import { CollectService } from './collect.service';
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
    constructor(collectService: CollectService);
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
    }): Promise<any>;
}
export {};
