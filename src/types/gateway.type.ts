import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { Transaction } from './transaction';
import { TransactionStatus } from './transactionStatus';

export type GatewayService = {
  collect(
    request: CollectRequest,
    ...args: any
  ): Promise<Transaction | undefined>;
  checkStatus(
    transactionId: String,
    collect_request?: CollectRequest,
  ): Promise<{ status: TransactionStatus; amount: number }>;
};
