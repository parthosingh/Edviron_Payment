import { CollectService } from './collect.service';
export declare class CollectController {
    private readonly collectService;
    constructor(collectService: CollectService);
    collect(body: {
        amount: Number;
        callbackUrl: String;
        jwt: string;
    }): Promise<any>;
}
