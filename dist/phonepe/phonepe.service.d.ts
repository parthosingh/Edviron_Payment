import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { Transaction } from 'src/types/transaction';
import { TransactionStatus } from 'src/types/transactionStatus';
export declare class PhonepeService {
    collect(request: CollectRequest): Promise<Transaction>;
    checkStatus(transactionId: String): Promise<{
        status: TransactionStatus;
        amount: number;
    }>;
}
