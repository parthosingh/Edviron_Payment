import { DatabaseService } from 'src/database/database.service';
import { SmartgatewayService } from './smartgateway.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class SmartgatewayController {
    private readonly databaseService;
    private readonly smartgatewayService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, smartgatewayService: SmartgatewayService, edvironPgService: EdvironPgService);
    handleCallback(body: {
        order_id: string;
        status: string;
        sdk_status: string;
        status_id: string;
    }, res: any): Promise<any>;
    handleCallbackGet(body: {
        order_id: string;
        status: string;
        sdk_status: string;
        status_id: string;
    }, res: any): Promise<any>;
    webhook(body: any, res: any): Promise<void>;
}
