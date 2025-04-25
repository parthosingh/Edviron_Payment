import { HdfcRazorpayService } from './hdfc_razorpay.service';
import { DatabaseService } from 'src/database/database.service';
export declare class HdfcRazorpayController {
    private readonly hdfcRazorpayService;
    private readonly databaseService;
    constructor(hdfcRazorpayService: HdfcRazorpayService, databaseService: DatabaseService);
    handleCallback(body: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }, collect_id: string, res: any): Promise<any>;
    handleRedirectPaymentPage(collect_id: string, order_id: string, school_name: string, res: any): Promise<void>;
    webhook(body: any, res: any): Promise<void>;
}
