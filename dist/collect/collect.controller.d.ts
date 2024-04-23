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
<<<<<<< HEAD
=======
        student_id?: string;
        student_email?: string;
        student_name?: string;
        student_phone?: string;
        student_receipt?: string;
<<<<<<< HEAD
=======
        platform_charges: any;
>>>>>>> 0081548 (adding MDR)
<<<<<<< HEAD
>>>>>>> a1ec662 (adding MDR)
=======
=======
        platform_charges: platformChange[];
>>>>>>> 5d9361b (add type)
>>>>>>> 4635644 (add type)
=======
>>>>>>> 821a0c6 (rebased with main)
    }): Promise<any>;
}
export {};
