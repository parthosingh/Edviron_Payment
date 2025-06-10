import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { platformChange } from './collect.controller';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { HdfcRazorpayService } from 'src/hdfc_razporpay/hdfc_razorpay.service';
import { PayUService } from 'src/pay-u/pay-u.service';
import { SmartgatewayService } from 'src/smartgateway/smartgateway.service';
import { PosPaytmService } from 'src/pos-paytm/pos-paytm.service';
import { NttdataService } from 'src/nttdata/nttdata.service';
import { WorldlineService } from 'src/worldline/worldline.service';
export declare class CollectService {
    private readonly phonepeService;
    private readonly hdfcService;
    private readonly edvironPgService;
    private readonly databaseService;
    private readonly ccavenueService;
    private readonly hdfcRazorpay;
    private readonly payuService;
    private readonly hdfcSmartgatewayService;
    private readonly posPaytmService;
    private readonly nttdataService;
    private readonly worldLineService;
    constructor(phonepeService: PhonepeService, hdfcService: HdfcService, edvironPgService: EdvironPgService, databaseService: DatabaseService, ccavenueService: CcavenueService, hdfcRazorpay: HdfcRazorpayService, payuService: PayUService, hdfcSmartgatewayService: SmartgatewayService, posPaytmService: PosPaytmService, nttdataService: NttdataService, worldLineService: WorldlineService);
    collect(amount: Number, callbackUrl: string, school_id: string, trustee_id: string, disabled_modes: string[] | undefined, platform_charges: platformChange[], clientId?: string, clientSecret?: string, webHook?: string, additional_data?: {}, custom_order_id?: string, req_webhook_urls?: string[], school_name?: string, easebuzz_sub_merchant_id?: string, ccavenue_merchant_id?: string, ccavenue_access_code?: string, ccavenue_working_key?: string, smartgateway_customer_id?: string | null, smartgateway_merchant_id?: string | null, smart_gateway_api_key?: string | null, splitPayments?: boolean, pay_u_key?: string | null, pay_u_salt?: string | null, hdfc_razorpay_id?: string, hdfc_razorpay_secret?: string, hdfc_razorpay_mid?: string, nttdata_id?: string | null, nttdata_secret?: string | null, nttdata_hash_req_key?: string | null, nttdata_hash_res_key?: string | null, nttdata_res_salt?: string | null, nttdata_req_salt?: string | null, worldline_merchant_id?: string | null, worldline_encryption_key?: string | null, worldline_encryption_iV?: string | null, worldline_scheme_code?: string[], vendor?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
            scheme_code?: string;
        }
    ], isVBAPayment?: boolean, vba_account_number?: string): Promise<{
        url: string;
        request: CollectRequest;
    }>;
    posCollect(amount: Number, callbackUrl: string, school_id: string, trustee_id: string, machine_name?: string, platform_charges?: platformChange[], paytm_pos?: {
        paytmMid?: string;
        paytmTid?: string;
        channel_id?: string;
        paytm_merchant_key?: string;
        device_id?: string;
    }, additional_data?: {}, custom_order_id?: string, req_webhook_urls?: string[], school_name?: string): Promise<{
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
    } | undefined>;
    sendCallbackEmail(collect_id: string): Promise<"mail sent successfully" | undefined>;
}
