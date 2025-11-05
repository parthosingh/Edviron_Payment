import { DatabaseService } from '../database/database.service';
import { CollectRequest } from '../database/schemas/collect_request.schema';
import { HdfcService } from '../hdfc/hdfc.service';
import { PhonepeService } from '../phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { platformChange } from './collect.controller';
import { CcavenueService } from '../ccavenue/ccavenue.service';
import { HdfcRazorpayService } from 'src/hdfc_razporpay/hdfc_razorpay.service';
import { PayUService } from 'src/pay-u/pay-u.service';
import { SmartgatewayService } from 'src/smartgateway/smartgateway.service';
import { PosPaytmService } from 'src/pos-paytm/pos-paytm.service';
import { NttdataService } from 'src/nttdata/nttdata.service';
import { WorldlineService } from 'src/worldline/worldline.service';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';
import { GatepayService } from 'src/gatepay/gatepay.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
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
    private readonly razorpayNonseamlessService;
    private readonly gatepayService;
    private readonly cashfreeService;
    private readonly easebuzzService;
    constructor(phonepeService: PhonepeService, hdfcService: HdfcService, edvironPgService: EdvironPgService, databaseService: DatabaseService, ccavenueService: CcavenueService, hdfcRazorpay: HdfcRazorpayService, payuService: PayUService, hdfcSmartgatewayService: SmartgatewayService, posPaytmService: PosPaytmService, nttdataService: NttdataService, worldLineService: WorldlineService, razorpayNonseamlessService: RazorpayNonseamlessService, gatepayService: GatepayService, cashfreeService: CashfreeService, easebuzzService: EasebuzzService);
    collect(amount: Number, callbackUrl: string, school_id: string, trustee_id: string, disabled_modes: string[] | undefined, platform_charges: platformChange[], clientId?: string, clientSecret?: string, webHook?: string, additional_data?: {}, custom_order_id?: string, req_webhook_urls?: string[], school_name?: string, easebuzz_sub_merchant_id?: string, ccavenue_merchant_id?: string, ccavenue_access_code?: string, ccavenue_working_key?: string, smartgateway_customer_id?: string | null, smartgateway_merchant_id?: string | null, smart_gateway_api_key?: string | null, splitPayments?: boolean, pay_u_key?: string | null, pay_u_salt?: string | null, hdfc_razorpay_id?: string, hdfc_razorpay_secret?: string, hdfc_razorpay_mid?: string, nttdata_id?: string | null, nttdata_secret?: string | null, nttdata_hash_req_key?: string | null, nttdata_hash_res_key?: string | null, nttdata_res_salt?: string | null, nttdata_req_salt?: string | null, worldline_merchant_id?: string | null, worldline_encryption_key?: string | null, worldline_encryption_iV?: string | null, worldline_scheme_code?: string | null, currency?: string | null, vendor?: [
        {
            vendor_id: string;
            edv_vendor_id?: string;
            percentage?: number;
            amount?: number;
            name?: string;
            scheme_code?: string;
        }
    ], vendorgateway?: {
        easebuzz: boolean;
        cashfree: boolean;
    }, easebuzzVendors?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ], cashfreeVedors?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ], isVBAPayment?: boolean, vba_account_number?: string, worldLine_vendors?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
            scheme_code?: string;
        }
    ], easebuzz_school_label?: string | null, razorpay_vendors?: [
        {
            vendor_id: string;
            account?: string;
            percentage?: number;
            amount?: number;
            name?: string;
            notes?: {
                branch?: string;
                name?: string;
            };
            linked_account_notes?: string[];
            on_hold?: boolean;
            on_hold_until?: Date;
        }
    ], razorpay_credentials?: {
        razorpay_id?: string | null;
        razorpay_secret?: string | null;
        razorpay_mid?: string | null;
        razorpay_account?: string | null;
    }, gatepay_credentials?: {
        gatepay_mid?: string | null;
        gatepay_terminal_id?: string | null;
        gatepay_key?: string | null;
        gatepay_iv?: string | null;
    }, isCFNonSeamless?: boolean, razorpay_seamless_credentials?: {
        razorpay_id?: string | null;
        razorpay_secret?: string | null;
        razorpay_mid?: string | null;
        razorpay_account?: string | null;
    }, isSelectGateway?: boolean, isEasebuzzNonpartner?: boolean, easebuzz_non_partner_cred?: {
        easebuzz_salt: string;
        easebuzz_key: string;
        easebuzz_merchant_email: string;
        easebuzz_submerchant_id: string;
    }, razorpay_partner?: boolean, additionalDataToggle?: boolean): Promise<{
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
    scheduleUpdate(delay: number, collect_id: string): Promise<void>;
}
