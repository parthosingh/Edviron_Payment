import { CollectRequest } from "src/database/schemas/collect_request.schema"
import { Transaction } from "./transaction"
import { TransactionStatus } from "./transactionStatus"

export type GatewayService = {
    collect(request: CollectRequest): Promise<Transaction>
    checkStatus(transactionId: String): Promise<{status: TransactionStatus, amount: number}>
}