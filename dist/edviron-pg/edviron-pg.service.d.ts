import { CollectRequest } from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus } from '../types/transactionStatus';
import { platformChange } from 'src/collect/collect.controller';
export declare class EdvironPgService implements GatewayService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    collect(request: CollectRequest, platform_charges: platformChange[], school_name: any): Promise<Transaction | undefined>;
    checkStatus(collect_request_id: String, collect_request: CollectRequest): Promise<{
        status: TransactionStatus;
        amount: number;
        details?: any;
    }>;
    easebuzzCheckStatus(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
}
