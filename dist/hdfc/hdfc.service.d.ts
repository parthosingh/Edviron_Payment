import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { GatewayService } from 'src/types/gateway.type';
import { Transaction } from 'src/types/transaction';
import { TransactionStatus } from 'src/types/transactionStatus';
import { DatabaseService } from 'src/database/database.service';
export declare class HdfcService implements GatewayService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    encrypt(plainText: string, workingKey: string): string;
    decrypt(encText: string, workingKey: string): string;
    ccavRequestHandler(p_merchant_id: string, p_order_id: string, p_currency: string, p_amount: string, p_redirect_url: string, p_cancel_url: string, p_language: string, p_billing_name: string, p_billing_address: string, p_billing_city: string, p_billing_state: string, p_billing_zip: string, p_billing_country: string, p_billing_tel: string, p_billing_email: string, p_delivery_name: string, p_delivery_address: string, p_delivery_city: string, p_delivery_state: string, p_delivery_zip: string, p_delivery_country: string, p_delivery_tel: string, p_merchant_param1: string, p_merchant_param2: string, p_merchant_param3: string, p_merchant_param4: string, p_merchant_param5: string, p_promo_code: string, p_customer_identifier: string): {
        encRequest: string;
        access_code: string | undefined;
    };
    collect(request: CollectRequest): Promise<Transaction>;
    ccavResponseToCollectRequestId(encResp: string): Promise<String>;
    checkStatus(collectRequestId: String): Promise<{
        status: TransactionStatus;
        amount: number;
        paymentInstrument?: string | null;
        paymentInstrumentBank?: string | null;
    }>;
}
