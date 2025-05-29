import { PosPaytmService } from './pos-paytm.service';
import { platformChange } from 'src/collect/collect.controller';
export declare class PosPaytmController {
    private readonly posPaytmService;
    constructor(posPaytmService: PosPaytmService);
    initiatePayment(body: {
        amount: Number;
        callbackUrl: string;
        jwt: string;
        school_id: string;
        trustee_id: string;
        paytm_pos: {
            paytmMid: string;
            paytmTid: string;
            channel_id: string;
            paytm_merchant_key: string;
            device_id: string;
        };
        platform_charges: platformChange[];
        additional_data?: {};
        custom_order_id?: string;
        req_webhook_urls?: string[];
        school_name?: string;
    }): Promise<{
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
}
