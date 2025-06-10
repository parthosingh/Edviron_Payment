import { DatabaseService } from 'src/database/database.service';
import { WorldlineService } from './worldline.service';
export declare class WorldlineController {
    private readonly databaseService;
    private readonly worldlineService;
    constructor(databaseService: DatabaseService, worldlineService: WorldlineService);
    worldlinePayment(req: any, res: any): Promise<any>;
    handleCallbackPost(req: any, res: any): Promise<any>;
    handleCallbackRest(req: any, res: any): Promise<any>;
    handleWebhook(req: any, res: any): Promise<any>;
}
