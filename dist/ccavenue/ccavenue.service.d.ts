import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { TransactionStatus } from 'src/types/transactionStatus';
import { DatabaseService } from 'src/database/database.service';
export declare class CcavenueService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    encrypt(plainText: string, workingKey: string): string;
    decrypt(encText: string, workingKey: string): string;
    ccavRequestHandler(p_merchant_id: string, p_order_id: string, p_currency: string, p_amount: string, p_redirect_url: string, p_cancel_url: string, p_language: string, p_billing_name: string, p_billing_address: string, p_billing_city: string, p_billing_state: string, p_billing_zip: string, p_billing_country: string, p_billing_tel: string, p_billing_email: string, p_delivery_name: string, p_delivery_address: string, p_delivery_city: string, p_delivery_state: string, p_delivery_zip: string, p_delivery_country: string, p_delivery_tel: string, p_merchant_param1: string, p_merchant_param2: string, p_merchant_param3: string, p_merchant_param4: string, p_merchant_param5: string, p_promo_code: string, p_customer_identifier: string, ccavenue_working_key: string, ccavenue_access_code: string): {
        encRequest: string;
        access_code: string;
    };
    createOrder(request: CollectRequest): Promise<{
        url: string;
    }>;
    ccavResponseToCollectRequestId(encResp: string, ccavenue_working_key: string): Promise<String>;
    checkStatus(collect_request: CollectRequest, collect_request_id: string): Promise<{
        status: TransactionStatus;
        amount: number;
        paymentInstrument?: string | null;
        paymentInstrumentBank?: string | null;
        decrypt_res?: any;
        transaction_time?: string;
        bank_ref?: string;
    }>;
    checkStatusProd(collect_request: CollectRequest, collect_request_id: string): Promise<{
        status: TransactionStatus;
        amount: number;
        transaction_amount?: number | null;
        status_code?: string | null;
        details?: any;
        paymentInstrument?: string | null;
        paymentInstrumentBank?: string | null;
        decrypt_res?: any;
        transaction_time?: string;
        bank_ref?: string;
    }>;
}
