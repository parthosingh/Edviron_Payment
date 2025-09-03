import { RazorpayService } from './razorpay.service';
import { DatabaseService } from '../database/database.service';
export declare class RazorpayController {
    private readonly razorpayService;
    private readonly databaseService;
    constructor(razorpayService: RazorpayService, databaseService: DatabaseService);
    handleCallback(body: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }, collect_id: string, res: any): Promise<any>;
    getDispute(collect_id: string, dispute_id: string, token: string): Promise<any>;
}
