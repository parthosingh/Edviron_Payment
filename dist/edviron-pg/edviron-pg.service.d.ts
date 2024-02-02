import { CollectRequest } from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { TransactionStatus } from '../types/transactionStatus';
export declare class EdvironPgService implements GatewayService {
    constructor();
    collect(request: CollectRequest): Promise<Transaction | undefined>;
    checkStatus(collect_request_id: String, collect_request: CollectRequest): Promise<{
        status: TransactionStatus;
        amount: number;
        details?: any;
    }>;
}
