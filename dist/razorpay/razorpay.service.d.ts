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
    getPaymentStatus(order_id: string, collectRequest: CollectRequest): Promise<any>;
    checkOrderStatus(collectId: string, collectRequest: CollectRequest): Promise<any>;
    checkOrderStatusByRazorpayId(razorpayId: string, collectRequest: CollectRequest): Promise<any>;
    checkPaymentStatus(paymentId: string, collectRequest: CollectRequest): Promise<any>;
    formatRazorpayPaymentStatusResponse(response: any, collectRequest: CollectRequest): Promise<any>;
    fetchCardDetailsOfaPaymentFromRazorpay(payment_id: string, collectRequest: CollectRequest): Promise<any>;
    getDispute(dispute_id: string, razorpay_mid: string, collectRequest: any): Promise<any>;
    getQr(collectRequest: CollectRequest): Promise<{
        base64Image: any;
        intent: any;
        phonePe: any;
        paytm: any;
        googlePe: string;
    }>;
    refund(collect_id: string, refundAmount: number, refund_id: string): Promise<any>;
    getbase64(url: string): Promise<{
        base64Image: any;
        intent: any;
        phonePe: any;
        paytm: any;
        googlePe: string;
    }>;
    saveRazorpayCommission(collectReq: CollectRequest, platform_type: string): Promise<void>;
    submitDisputeEvidence(dispute_id: string, documents: Array<{
        document_type: string;
        file_url: string;
        name: string;
    }>, credentials: {
        razorpay_id: string;
        razorpay_secret: string;
        razorpay_mid: string;
        order_id: string;
        payment_id?: string;
        razorpay_signature?: string;
        razorpay_account?: string;
    }): Promise<{
        dispute_id: string;
        uploadedDocuments: {
            document_id: any;
            document_type: string;
            name: string;
            file_url: string;
        }[];
    }>;
    terminateNotInitiatedOrder(collect_id: string): Promise<true | undefined>;
    acceptDispute(dispute_id: string, credentials: {
        razorpay_id: string;
        razorpay_secret: string;
        razorpay_mid: string;
        order_id: string;
        payment_id?: string;
        razorpay_signature?: string;
        razorpay_account?: string;
    }): Promise<{
        message: string;
        dispute_id: string;
        razorpay_response: any;
    }>;
}
