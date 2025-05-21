import { CollectRequestDocument } from 'src/database/schemas/collect_request.schema';
export declare class PosPaytmService {
    constructor();
    createOrder(collectRequest: CollectRequestDocument): Promise<void>;
}
