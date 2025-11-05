import { DatabaseService } from 'src/database/database.service';
import { EasebuzzService } from './easebuzz.service';
import { platformChange } from 'src/collect/collect.controller';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class EasebuzzController {
    private readonly easebuzzService;
    private readonly databaseService;
    private readonly edvironPgService;
    constructor(easebuzzService: EasebuzzService, databaseService: DatabaseService, edvironPgService: EdvironPgService);
    redirect(collect_id: string, easebuzzPaymentId: string, res: any): Promise<void>;
    getQr(res: any, req: any): Promise<any>;
    getEncryptedInfo(res: any, req: any, body: any): Promise<any>;
    getRefundhash(req: any): Promise<any>;
    checkRefund(req: any): Promise<any>;
    settlementRecon(body: {
        submerchant_id: string;
        start_date: string;
        end_date: string;
        page_size: number;
        token: string;
    }): Promise<{
        transactions: any;
        split_payouts: any;
        peb_refunds: any;
    }>;
    settlementReconV2(body: {
        submerchant_id: string;
        easebuzz_key: string;
        easebuzz_salt: string;
        start_date: string;
        end_date: string;
        payout_date: string;
        page_size: number;
        token: string;
        utr: string;
    }): Promise<{
        transactions: any[];
        split_payouts: any;
        peb_refunds: any;
    }>;
    updateEasebuzzDispute(body: {
        case_id: string;
        action: string;
        reason: string;
        documents: Array<{
            document_type: any;
            file_url: string;
        }>;
        sign: string;
    }): Promise<any>;
    createOrderV2(body: {
        amount: Number;
        callbackUrl: string;
        jwt: string;
        school_id: string;
        trustee_id: string;
        webHook?: string;
        disabled_modes?: string[];
        platform_charges: platformChange[];
        additional_data?: {};
        custom_order_id?: string;
        req_webhook_urls?: string[];
        school_name?: string;
        easebuzz_sub_merchant_id?: string;
        split_payments?: boolean;
        easebuzz_school_label?: string | null;
        easebuzzVendors?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
            }
        ];
        easebuzz_non_partner_cred: {
            easebuzz_salt: string;
            easebuzz_key: string;
            easebuzz_merchant_email: string;
            easebuzz_submerchant_id: string;
        };
        additionalDataToggle: boolean;
    }): Promise<any>;
    createOrderNonSeamless(body: {
        amount: Number;
        callbackUrl: string;
        jwt: string;
        school_id: string;
        trustee_id: string;
        webHook?: string;
        disabled_modes?: string[];
        platform_charges: platformChange[];
        additional_data?: {};
        custom_order_id?: string;
        req_webhook_urls?: string[];
        school_name?: string;
        easebuzz_sub_merchant_id?: string;
        split_payments?: boolean;
        easebuzz_school_label?: string | null;
        easebuzzVendors?: [
            {
                vendor_id: string;
                percentage?: number;
                amount?: number;
                name?: string;
            }
        ];
        easebuzz_non_partner_cred: {
            easebuzz_salt: string;
            easebuzz_key: string;
            easebuzz_merchant_email: string;
            easebuzz_submerchant_id: string;
        };
        additionalDataToggle: boolean;
    }): Promise<any>;
    easebuzzWebhook(body: any, res: any): Promise<any>;
    handleEasebuzzCallback(req: any, res: any): Promise<any>;
    handleEasebuzzCallbackPost(req: any, res: any): Promise<any>;
    handleEasebuzzNonSeamlessCallbackPost(body: any, req: any, res: any): Promise<any>;
    handleEasebuzzNonSeamlessCallback(body: any, req: any, res: any): Promise<any>;
    encCardData(body: {
        merchant_id: string;
        pg_key: string;
        data: {
            card_number: string;
            card_holder_name: string;
            card_cvv: string;
            card_expiry_date: string;
        };
    }): Promise<{
        enc_card_number: any;
        enc_card_holder_name: any;
        enc_card_cvv: any;
        enc_card_expiry_date: any;
    }>;
}
