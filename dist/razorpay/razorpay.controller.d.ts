import { RazorpayService } from './razorpay.service';
import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';
export declare class RazorpayController {
    private readonly razorpayService;
    private readonly databaseService;
    private readonly edvironPgService;
    private readonly razorpayNonSeamless;
    constructor(razorpayService: RazorpayService, databaseService: DatabaseService, edvironPgService: EdvironPgService, razorpayNonSeamless: RazorpayNonseamlessService);
    handleCallback(req: any, res: any): Promise<any>;
    handleCallbackV2(req: any, res: any): Promise<any>;
    handleCallbackPost(req: any, res: any): Promise<any>;
    handleCallbackV2Post(req: any, res: any): Promise<any>;
    getDispute(collect_id: string, dispute_id: string, token: string): Promise<any>;
    webhook(body: any, res: any): Promise<any>;
    getQr(collect_id: string): Promise<{
        base64Image: any;
        intent: any;
        phonePe: any;
        paytm: any;
        googlePe: string;
    }>;
    initiateRefund(collect_id: string, refundAmount: number, refund_id: string): Promise<any>;
}
