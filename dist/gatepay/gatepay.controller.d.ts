import { DatabaseService } from '../database/database.service';
import { GatepayService } from './gatepay.service';
export declare class GatepayController {
    private readonly databaseService;
    private readonly gatepayService;
    constructor(databaseService: DatabaseService, gatepayService: GatepayService);
    redirect(collect_id: string, res: any): Promise<void>;
    handleCallback(req: any, res: any): Promise<any>;
    initiateRefund(body: {
        collect_id: string;
        amount: number;
        refund_id: string;
    }): Promise<{
        collect_id: string;
        refund_id: string;
        amount: number;
        gateway: string;
        response: any;
    }>;
}
