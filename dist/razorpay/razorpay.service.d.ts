import { TransactionStatus } from '../types/transactionStatus';
import { CollectRequest } from '../database/schemas/collect_request.schema';
import { DatabaseService } from '../database/database.service';
export declare const formatRazorpayPaymentStatus: (status: string) => TransactionStatus;
export declare class RazorpayService {
    private readonly databaseService;
    private readonly CLIENT_ID;
    private readonly CLIENT_SECRET;
    private readonly API_URL;
    constructor(databaseService: DatabaseService);
    verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean>;
    createOrder(collectRequest: CollectRequest): Promise<any>;
    checkOrderStatus(collectId: string, collectRequest: CollectRequest): Promise<any>;
    checkOrderStatusByRazorpayId(razorpayId: string, collectRequest: CollectRequest): Promise<any>;
    checkPaymentStatus(paymentId: string, collectRequest: CollectRequest): Promise<any>;
    formatRazorpayPaymentStatusResponse(response: any, collectRequest: CollectRequest): Promise<any>;
    fetchCardDetailsOfaPaymentFromRazorpay(payment_id: string, collectRequest: CollectRequest): Promise<any>;
    getDispute(dispute_id: string, razorpay_mid: string, collectRequest: any): Promise<any>;
}
