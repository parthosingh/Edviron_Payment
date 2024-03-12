import { CollectService } from './collect.service';
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
<<<<<<< HEAD
        additional_data?: {};
<<<<<<< HEAD
=======
        student_id?: string;
        student_email?: string;
        student_name?: string;
        student_phone?: string;
        student_receipt?: string;
=======
        platform_charges: any;
>>>>>>> 0081548 (adding MDR)
>>>>>>> a1ec662 (adding MDR)
    }): Promise<any>;
}
