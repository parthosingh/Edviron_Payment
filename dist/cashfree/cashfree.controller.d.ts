import { DatabaseService } from 'src/database/database.service';
import { CashfreeService } from './cashfree.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { platformChange } from 'src/collect/collect.controller';
import { RazorpayService } from 'src/razorpay/razorpay.service';
export declare class CashfreeController {
    private readonly databaseService;
    private readonly cashfreeService;
    private readonly edvironPgService;
    private readonly easebuzzService;
    private readonly razorpayService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService, edvironPgService: EdvironPgService, easebuzzService: EasebuzzService, razorpayService: RazorpayService);
    initiateRefund(body: any): Promise<any>;
    initiateSplitRefund(body: {
        token: string;
        refund_amount: number;
        refund_id: string;
        refund_note: string;
        collect_id: string;
        refund_splits: [
            {
                vendor_id: string;
                amount: number;
                tags: {
                    reason: string;
                };
            }
        ];
    }): Promise<any>;
    getUpiPaymentInfoUrl(req: any): Promise<{
        base64Image: any;
        intent: any;
        phonePe: any;
        paytm: any;
        googlePe: string;
    } | {
        intentUrl: any;
        qrCodeBase64: any;
        collect_id: any;
    } | undefined>;
    getSettlementsTransactions(body: {
        limit: number;
        cursor: string | null;
    }, req: any): Promise<{
        cursor: any;
        limit: any;
        settlements_transactions: any[];
    }>;
    testWebhook(req: any, res: any): Promise<any>;
    testWebhook2(req: any, res: any): Promise<any>;
    checkStatus(req: any): Promise<any>;
    disputeEvidence(body: {
        dispute_id: string;
        action: string;
        documents: Array<{
            file: string;
            doc_type: string;
            note: string;
        }>;
        client_id: string;
        sign: string;
    }): Promise<any>;
    testSecureWebhook(req: any, res: any): Promise<any>;
    testUpload(body: {
        school_id: string;
    }): Promise<{
        document: string;
        response: any;
    }[]>;
    vbaWebhook(body: any, res: any): Promise<any>;
    createVBA(body: {
        cf_x_client_id: string;
        cf_x_clien_secret: string;
        school_id: string;
        token: string;
        virtual_account_details: {
            virtual_account_id: string;
            virtual_account_name: string;
            virtual_account_email: string;
            virtual_account_phone: string;
        };
        notification_group: string;
    }): Promise<any>;
    createVBAV2(body: {
        cf_x_client_id: string;
        cf_x_clien_secret: string;
        school_id: string;
        token: string;
        virtual_account_details: {
            virtual_account_id: string;
            virtual_account_name: string;
            virtual_account_email: string;
            virtual_account_phone: string;
        };
        notification_group: string;
        amount: number;
    }): Promise<any>;
    uploadKYC(body: {
        school_id: string;
    }): Promise<{
        document: string;
        response: any;
    }[] | undefined>;
    redirect(session_id: string, res: any): Promise<void>;
    createOrderV2(body: {
        amount: Number;
        callbackUrl: string;
        jwt: string;
        school_id: string;
        trustee_id: string;
        platform_charges: platformChange[];
        clientId: string;
        clientSecret: string;
        cashfree_credentials: {
            cf_x_client_id: string;
            cf_x_client_secret: string;
            cf_api_key: string;
        };
        webHook?: string;
        disabled_modes?: string[];
        additional_data?: {};
        custom_order_id?: string;
        req_webhook_urls?: string[];
        school_name?: string;
        split_payments?: boolean;
        isVBAPayment: boolean;
        vba_account_number: string;
        vendors_info?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
                scheme_code?: string;
            }
        ];
        vendorgateway?: {
            easebuzz: boolean;
            cashfree: boolean;
        };
        cashfreeVedors?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
            }
        ];
    }): Promise<any>;
    handleWebhook(body: any, res: any): Promise<void>;
}
