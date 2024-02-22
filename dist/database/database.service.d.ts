import { CollectRequestDocument } from './schemas/collect_request.schema';
import { Model } from 'mongoose';
import { CollectRequestStatusDocument } from './schemas/collect_req_status.schema';
export declare class DatabaseService {
    CollectRequestModel: Model<CollectRequestDocument>;
    WebhooksModel: Model<CollectRequestDocument>;
    CollectRequestStatusModel: Model<CollectRequestStatusDocument>;
    constructor(CollectRequestModel: Model<CollectRequestDocument>, WebhooksModel: Model<CollectRequestDocument>, CollectRequestStatusModel: Model<CollectRequestStatusDocument>);
}
