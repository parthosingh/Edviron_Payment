import { DatabaseService } from 'src/database/database.service';
import { RazorpayNonseamlessService } from './razorpay-nonseamless.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { RazorpayService } from 'src/razorpay/razorpay.service';
export declare class RazorpayNonseamlessController {
    private readonly databaseService;
    private readonly razorpayServiceModel;
    private readonly razorpayService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, razorpayServiceModel: RazorpayNonseamlessService, razorpayService: RazorpayService, edvironPgService: EdvironPgService);
    razorpayRedirect(req: any, res: any): Promise<any>;
    razorpayRedirectV2(req: any, res: any): Promise<any>;
    handleCallback(req: any, res: any): Promise<any>;
    handleCallbackGet(req: any, res: any): Promise<any>;
    webhook(body: any, res: any): Promise<any>;
    webhookV2(body: any, res: any): Promise<any>;
    refund(body: any): Promise<any>;
    razorpayOrders(razorpay_id: string, razorpay_secret: string, count: string | undefined, skip: string | undefined, school_id: string, trustee_id: string, razorpay_mid: string, from: string, to: string): Promise<{
        message: string;
    }>;
    getSettlementsTransactions(body: {
        limit: number;
        cursor: string | null;
        skip: number;
        fromDate: Date;
    }, req: any): Promise<false | {
        cursor: any;
        limit: number;
        settlements_transactions: any[];
    }>;
    initRefund(body: {
        collect_id: string;
        refundAmount: number;
        refund_id: string;
    }): Promise<any>;
    disputeEvidence(body: {
        dispute_id: string;
        action: string;
        documents: [
            {
                document_type: string;
                file_url: string;
                name: string;
            }
        ];
        sign: string;
        collect_id: string;
    }): Promise<{
        dispute_id: string;
        uploadedDocuments: {
            document_id: any;
            document_type: string;
            name: string;
            file_url: string;
        }[];
    } | {
        message: string;
        dispute_id: string;
        razorpay_response: any;
    }>;
}
