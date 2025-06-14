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
    fetchAndStoreAll(authId: string, authSecret: string, params: Record<string, any>): Promise<any[]>;
    fetchOrdersPage(authId: string, authSecret: string, count: number, skip: number, extraParams?: Record<string, any>): Promise<any>;
}
