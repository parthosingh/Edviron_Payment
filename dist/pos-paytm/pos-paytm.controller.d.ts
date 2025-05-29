import { PosPaytmService } from './pos-paytm.service';
export declare class PosPaytmController {
    private readonly posPaytmService;
    constructor(posPaytmService: PosPaytmService);
    initiatePayment(): Promise<{
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
}
