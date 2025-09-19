import { RazorpayService } from './razorpay.service';
import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class RazorpayController {
    private readonly razorpayService;
    private readonly databaseService;
    private readonly edvironPgService;
    constructor(razorpayService: RazorpayService, databaseService: DatabaseService, edvironPgService: EdvironPgService);
    handleCallback(req: any, res: any): Promise<any>;
    getDispute(collect_id: string, dispute_id: string, token: string): Promise<any>;
    webhook(body: any, res: any): Promise<any>;
    getQr(collect_id: string): Promise<{
        qr_id: any;
        status: any;
        image_url: any;
    }>;
}
