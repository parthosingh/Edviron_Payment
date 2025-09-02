import { CollectRequestDocument } from './schemas/collect_request.schema';
import { Model } from 'mongoose';
import { WebhooksDocument } from './schemas/webhooks.schema';
import { CollectRequestStatusDocument } from './schemas/collect_req_status.schema';
import { VendorTransactionDocument } from './schemas/vendor.Transaction.schema';
import { ErpWebhooksLogs } from './schemas/erp.webhooks.logs.schema';
import { BatchTransactionsDocument } from './schemas/batch.transactions.schema';
import { ErrorLogsDocument } from './schemas/error.logs.schema';
import { SchoolMdrDocument } from './schemas/platform.charges.schema';
import { InstallmentsDocument } from './schemas/installments.schema';
export declare class DatabaseService {
    CollectRequestModel: Model<CollectRequestDocument>;
    WebhooksModel: Model<WebhooksDocument>;
    CollectRequestStatusModel: Model<CollectRequestStatusDocument>;
    VendorTransactionModel: Model<VendorTransactionDocument>;
    ErpWebhooksLogsModel: Model<ErpWebhooksLogs>;
    BatchTransactionModel: Model<BatchTransactionsDocument>;
    ErrorLogsModel: Model<ErrorLogsDocument>;
    PlatformChargeModel: Model<SchoolMdrDocument>;
    InstallmentsModel: Model<InstallmentsDocument>;
    constructor(CollectRequestModel: Model<CollectRequestDocument>, WebhooksModel: Model<WebhooksDocument>, CollectRequestStatusModel: Model<CollectRequestStatusDocument>, VendorTransactionModel: Model<VendorTransactionDocument>, ErpWebhooksLogsModel: Model<ErpWebhooksLogs>, BatchTransactionModel: Model<BatchTransactionsDocument>, ErrorLogsModel: Model<ErrorLogsDocument>, PlatformChargeModel: Model<SchoolMdrDocument>, InstallmentsModel: Model<InstallmentsDocument>);
}
