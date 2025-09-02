import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class EdvironPayService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    createOrder(request: CollectRequest): Promise<void>;
}
