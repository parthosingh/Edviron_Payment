import { CollectRequest } from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus } from '../types/transactionStatus';
export declare class EdvironPgService implements GatewayService {
<<<<<<< HEAD
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    collect(request: CollectRequest): Promise<Transaction | undefined>;
=======
    constructor();
    collect(request: CollectRequest, platform_charges: any): Promise<Transaction | undefined>;
>>>>>>> 633e538 (adding MDR)
    checkStatus(collect_request_id: String, collect_request: CollectRequest): Promise<{
        status: TransactionStatus;
        amount: number;
        details?: any;
    }>;
}
