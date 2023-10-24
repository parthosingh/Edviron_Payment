import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { Transaction } from 'src/types/transaction';
import { TransactionStatus } from 'src/types/transactionStatus';
import { GatewayService } from 'src/types/gateway.type';
export declare class PhonepeService implements GatewayService {
    collect(request: CollectRequest): Promise<Transaction>;
    checkStatus(transactionId: String): Promise<{
        status: TransactionStatus;
        amount: number;
    }>;
}
