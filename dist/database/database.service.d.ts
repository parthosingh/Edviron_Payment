import { CollectRequestDocument } from './schemas/collect_request.schema';
import { Model } from 'mongoose';
import { WebhooksDocument } from './schemas/webhooks.schema';
import { CollectRequestStatusDocument } from './schemas/collect_req_status.schema';
import { VendorTransactionDocument } from './schemas/vendor.Transaction.schema';
export declare class DatabaseService {
    CollectRequestModel: Model<CollectRequestDocument>;
    WebhooksModel: Model<WebhooksDocument>;
    CollectRequestStatusModel: Model<CollectRequestStatusDocument>;
    VendorTransactionModel: Model<VendorTransactionDocument>;
    constructor(CollectRequestModel: Model<CollectRequestDocument>, WebhooksModel: Model<WebhooksDocument>, CollectRequestStatusModel: Model<CollectRequestStatusDocument>, VendorTransactionModel: Model<VendorTransactionDocument>);
}
