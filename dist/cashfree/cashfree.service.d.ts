import { DatabaseService } from 'src/database/database.service';
export declare class CashfreeService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    initiateRefund(refund_id: string, amount: number, collect_id: string): Promise<any>;
    terminateOrder(collect_id: string): Promise<any>;
}
