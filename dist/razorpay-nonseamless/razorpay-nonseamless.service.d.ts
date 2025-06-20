import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
export declare class RazorpayNonseamlessService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    createOrder(collectRequest: CollectRequest): Promise<{
        url: string;
        collect_req: CollectRequest;
    }>;
    getPaymentStatus(order_id: string, collectRequest: CollectRequest): Promise<any>;
    formatRazorpayPaymentStatusResponse(response: any, collectRequest: CollectRequest): Promise<any>;
    fetchCardDetailsOfaPaymentFromRazorpay(payment_id: string, collectRequest: CollectRequest): Promise<any>;
    refund(collect_id: string, refundAmount: number, refund_id: string): Promise<any>;
    fetchAndStoreAll(authId: string, authSecret: string, school_id: string, trustee_id: string, params: Record<string, any>, razorpay_mid: string): Promise<any[]>;
    retriveRazorpay(authId: string, authSecret: string, order_id: string): Promise<any>;
    fetchOrdersPage(authId: string, authSecret: string, count: number, skip: number, extraParams?: Record<string, any>): Promise<any>;
    getTransactionForSettlements(utr: string, razorpay_id: string, razropay_secret: string, token: string, cursor: string | null, fromDate: Date, limit: number, skip: number): Promise<false | {
        cursor: any;
        limit: number;
        settlements_transactions: any[];
    }>;
}
