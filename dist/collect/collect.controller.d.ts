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
        additional_data?: {};
        student_id?: string;
        student_email?: string;
        student_name?: string;
        student_phone?: string;
        student_receipt?: string;
    }): Promise<any>;
}
