import { CollectRequestDocument } from './schemas/collect_request.schema';
import { Model } from 'mongoose';
import { WebhooksDocument } from './schemas/webhooks.schema';
import { CollectRequestStatusDocument } from './schemas/collect_req_status.schema';
export declare class DatabaseService {
    CollectRequestModel: Model<CollectRequestDocument>;
    WebhooksModel: Model<WebhooksDocument>;
    CollectRequestStatusModel: Model<CollectRequestStatusDocument>;
    constructor(CollectRequestModel: Model<CollectRequestDocument>, WebhooksModel: Model<WebhooksDocument>, CollectRequestStatusModel: Model<CollectRequestStatusDocument>);
}
