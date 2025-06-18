import { DatabaseService } from '../database/database.service';
import { GatepayService } from './gatepay.service';
export declare class GatepayController {
    private readonly databaseService;
    private readonly gatepayService;
    constructor(databaseService: DatabaseService, gatepayService: GatepayService);
    handleCallback(req: any, res: any): Promise<any>;
}
