import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CollectRequest,
  CollectRequestSchema,
} from './schemas/collect_request.schema';
import { DatabaseService } from './database.service';
import * as dotenv from 'dotenv';
import {
  CollectRequestStatus,
  CollectRequestStatusSchema,
} from './schemas/collect_req_status.schema';
import { Webhooks, WebhooksSchema } from './schemas/webhooks.schema';
import { VendorTransaction, VendorTransactionSchema } from './schemas/vendor.Transaction.schema';
import { ErpWebhooksLogs, ErpWebhooksLogsSchema } from './schemas/erp.webhooks.logs.schema';
import { BatchTransactions, BatchTransactionsSchema } from './schemas/batch.transactions.schema';
import { ErrorLogs, ErrorLogsSchema } from './schemas/error.logs.schema';
dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    MongooseModule.forFeature([
      { name: CollectRequest.name, schema: CollectRequestSchema },
    ]),
    MongooseModule.forFeature([
      { name: CollectRequestStatus.name, schema: CollectRequestStatusSchema },
    ]),
    MongooseModule.forFeature([
      { name: Webhooks.name, schema: WebhooksSchema },
    ]),
    MongooseModule.forFeature([
      { name: VendorTransaction.name, schema: VendorTransactionSchema },
    ]),
    MongooseModule.forFeature([
      { name: ErpWebhooksLogs.name, schema: ErpWebhooksLogsSchema },
    ]),
    MongooseModule.forFeature([
      { name: BatchTransactions.name, schema: BatchTransactionsSchema },
    ]),
    MongooseModule.forFeature([
      { name: ErrorLogs.name, schema: ErrorLogsSchema },
    ]),
  ],
  providers: [DatabaseService],
  exports: [
    DatabaseService,
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    MongooseModule.forFeature([
      { name: CollectRequest.name, schema: CollectRequestSchema },
    ]),
    MongooseModule.forFeature([
      { name: CollectRequestStatus.name, schema: CollectRequestStatusSchema },
    ]),
    MongooseModule.forFeature([
      { name: Webhooks.name, schema: WebhooksSchema },
    ]),
    MongooseModule.forFeature([
      { name: VendorTransaction.name, schema: VendorTransactionSchema },
    ]),
    MongooseModule.forFeature([
      { name: ErpWebhooksLogs.name, schema: ErpWebhooksLogsSchema },
    ]),
    MongooseModule.forFeature([
      { name: BatchTransactions.name, schema: BatchTransactionsSchema },
    ]),
    MongooseModule.forFeature([
      { name: ErrorLogs.name, schema: ErrorLogsSchema },
    ]),
  ],
})
export class DatabaseModule {}
