import { CheckStatusService } from './check-status.service';
export declare class CheckStatusController {
    private readonly checkStatusService;
    constructor(checkStatusService: CheckStatusService);
    checkStatus(transactionId: String, jwt: string): Promise<any>;
}
