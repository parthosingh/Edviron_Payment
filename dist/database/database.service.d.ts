import { CollectRequestDocument } from './schemas/collect_request.schema';
import { Model } from 'mongoose';
export declare class DatabaseService {
    CollectRequestModel: Model<CollectRequestDocument>;
    constructor(CollectRequestModel: Model<CollectRequestDocument>);
}
