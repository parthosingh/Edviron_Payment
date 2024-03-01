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
        webHook?: string;
        disabled_modes?: string[];
    }): Promise<any>;
}
