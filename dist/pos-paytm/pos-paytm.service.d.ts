import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { DatabaseService } from 'src/database/database.service';
import { platformChange } from 'src/collect/collect.controller';
export declare class PosPaytmService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    nowInIST(): Promise<Date>;
    fmt(d: Date): Promise<string>;
    initiatePOSPayment(request: CollectRequest): Promise<{
        requestSent: {
            head: {
                requestTimeStamp: string;
                channelId: string | null | undefined;
                checksum: any;
            };
            body: {
                paytmMid: string | null | undefined;
                paytmTid: string | null | undefined;
                transactionDateTime: string;
                merchantTransactionId: string;
                merchantReferenceNo: string;
                transactionAmount: string;
                callbackUrl: string;
            };
        };
        paytmResponse: any;
    }>;
    collectPayment(amount: Number, callbackUrl: string, school_id: string, trustee_id: string, paytm_pos: {
        paytmMid: string;
        paytmTid: string;
        channel_id: string;
        paytm_merchant_key: string;
        device_id: string;
    }, platform_charges: platformChange[], additional_data?: {}, custom_order_id?: string, req_webhook_urls?: string[], school_name?: string): Promise<{
        requestSent: {
            head: {
                requestTimeStamp: string;
                channelId: string | null | undefined;
                checksum: any;
            };
            body: {
                paytmMid: string | null | undefined;
                paytmTid: string | null | undefined;
                transactionDateTime: string;
                merchantTransactionId: string;
                merchantReferenceNo: string;
                transactionAmount: string;
                callbackUrl: string;
            };
        };
        paytmResponse: any;
    }>;
    getTransactionStatus(orderId: string): Promise<any>;
    formattedStatu(collect_id: string): Promise<{
        status: any;
        amount: number;
        transaction_amount: any;
        status_code: string;
        details: any;
        custom_order_id: string | null;
    }>;
    getCardType(): Promise<void>;
}
