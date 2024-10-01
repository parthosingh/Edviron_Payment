import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class EasebuzzService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    easebuzzCheckStatus(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
    statusResponse(requestId: string, collectReq: CollectRequest): Promise<any>;
}
