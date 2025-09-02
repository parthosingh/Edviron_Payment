import { DatabaseService } from 'src/database/database.service';
export declare class EdvironPayController {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    upsertInstallments(body: any): Promise<{
        status: string;
    }>;
    testEndpoint(body: {
        isInatallment: boolean;
        InstallmentsIds: string[];
        school_id: string;
        trustee_id: string;
        callback_url: string;
        webhook_url: string;
        token: string;
        gateway: {
            cashfree: boolean;
            razorpay: boolean;
            easebuzz: boolean;
        };
        amount: number;
        disable_mode: string[];
        custom_order_id?: string;
        school_name?: string;
        isSplit?: boolean;
        isVBAPayment?: boolean;
        additional_data?: {};
        cashfree: {
            client_id: string;
            api_key: string;
            client_secret: string;
            isSeamless: boolean;
            isPartner: boolean;
            isVba: boolean;
            vba: {
                vba_account_number: string;
                vba_ifsc: string;
            };
            cashfreeVedors?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                }
            ];
        };
        razorpay: {
            key_id: string;
            key_secret: string;
            isSeamless: boolean;
            isPartner: boolean;
        };
        easebuzz: {
            mid: string;
            key: string;
            salt: string;
            isPartner: boolean;
            bank_label?: string;
            easebuzzVendors?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                }
            ];
        };
    }): Promise<void>;
}
