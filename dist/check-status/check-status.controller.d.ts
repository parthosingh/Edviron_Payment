import { CheckStatusService } from './check-status.service';
export declare class CheckStatusController {
    private readonly checkStatusService;
    constructor(checkStatusService: CheckStatusService);
    checkStatus(transactionId: String, jwt: string): Promise<any>;
    checkCustomOrderStatus(transactionId: String, jwt: string): Promise<any>;
    checkStatusv2(transactionId: String, jwt: string): Promise<any>;
}
