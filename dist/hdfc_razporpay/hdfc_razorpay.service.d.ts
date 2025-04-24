import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { TransactionStatus } from 'src/types/transactionStatus';
export declare const formatRazorpayPaymentStatus: (status: string) => TransactionStatus;
export declare class HdfcRazorpayService {
    private readonly databaseService;
    private readonly API_URL;
    constructor(databaseService: DatabaseService);
    verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean>;
    createOrder(request: CollectRequest): Promise<any>;
    checkPaymentStatus(paymentId: string, collectRequest: CollectRequest): Promise<any>;
    checkOrderStatus(collectId: string, collectRequest: CollectRequest): Promise<any>;
    formatRazorpayPaymentStatusResponse(response: any, collectRequest: CollectRequest): Promise<any>;
    fetchCardDetailsOfaPaymentFromRazorpay(payment_id: string, collectRequest: CollectRequest): Promise<any>;
}
