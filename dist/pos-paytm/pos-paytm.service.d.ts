import { DatabaseService } from 'src/database/database.service';
export declare class PosPaytmService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    nowInIST(): Promise<Date>;
    fmt(d: Date): Promise<string>;
    initiatePOSPayment(): Promise<{
        requestSent: {
            head: {
                requestTimeStamp: string;
                channelId: string;
                checksum: any;
            };
            body: {
                paytmMid: string;
                paytmTid: string;
                transactionDateTime: string;
                merchantTransactionId: string;
                merchantReferenceNo: string;
                transactionAmount: string;
                callbackUrl: string;
            };
        };
        paytmResponse: any;
    }>;
    collectPayment(): Promise<{
        requestSent: {
            head: {
                requestTimeStamp: string;
                channelId: string;
                checksum: any;
            };
            body: {
                paytmMid: string;
                paytmTid: string;
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
}
