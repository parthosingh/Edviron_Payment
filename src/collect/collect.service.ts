import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CollectRequest,
  Gateway,
} from '../database/schemas/collect_request.schema';
import { HdfcService } from '../hdfc/hdfc.service';
import { PhonepeService } from '../phonepe/phonepe.service';
import { Transaction } from '../types/transaction';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { PaymentStatus } from '../database/schemas/collect_req_status.schema';
import { platformChange } from './collect.controller';
import { CcavenueService } from '../ccavenue/ccavenue.service';
import * as nodemailer from 'nodemailer';
import { HdfcRazorpayService } from 'src/hdfc_razporpay/hdfc_razorpay.service';
import { PayUService } from 'src/pay-u/pay-u.service';
import { SmartgatewayService } from 'src/smartgateway/smartgateway.service';
import { PosPaytmService } from 'src/pos-paytm/pos-paytm.service';
import { NttdataService } from 'src/nttdata/nttdata.service';
import { WorldlineService } from 'src/worldline/worldline.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';
import { GatepayService } from 'src/gatepay/gatepay.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';

@Injectable()
export class CollectService {
  constructor(
    private readonly phonepeService: PhonepeService,
    private readonly hdfcService: HdfcService,
    private readonly edvironPgService: EdvironPgService,
    private readonly databaseService: DatabaseService,
    private readonly ccavenueService: CcavenueService,
    private readonly hdfcRazorpay: HdfcRazorpayService,
    private readonly payuService: PayUService,
    private readonly hdfcSmartgatewayService: SmartgatewayService,
    private readonly posPaytmService: PosPaytmService,
    private readonly nttdataService: NttdataService,
    private readonly worldLineService: WorldlineService,
    private readonly razorpayNonseamlessService: RazorpayNonseamlessService,
    private readonly gatepayService: GatepayService,
    private readonly cashfreeService: CashfreeService,
    private readonly easebuzzService: EasebuzzService
  ) { }


  async collect(
    amount: Number,
    callbackUrl: string,
    school_id: string,
    trustee_id: string,
    disabled_modes: string[] = [],
    platform_charges: platformChange[],
    clientId?: string,
    clientSecret?: string,
    webHook?: string,
    additional_data?: {},
    custom_order_id?: string,
    req_webhook_urls?: string[],
    school_name?: string,
    easebuzz_sub_merchant_id?: string,
    ccavenue_merchant_id?: string,
    ccavenue_access_code?: string,
    ccavenue_working_key?: string,
    smartgateway_customer_id?: string | null,
    smartgateway_merchant_id?: string | null,
    smart_gateway_api_key?: string | null,
    splitPayments?: boolean,
    pay_u_key?: string | null,
    pay_u_salt?: string | null,
    hdfc_razorpay_id?: string,
    hdfc_razorpay_secret?: string,
    hdfc_razorpay_mid?: string,
    nttdata_id?: string | null,
    nttdata_secret?: string | null,
    nttdata_hash_req_key?: string | null,
    nttdata_hash_res_key?: string | null,
    nttdata_res_salt?: string | null,
    nttdata_req_salt?: string | null,
    worldline_merchant_id?: string | null,
    worldline_encryption_key?: string | null,
    worldline_encryption_iV?: string | null,
    worldline_scheme_code?: string | null,
    currency?: string | null,
    vendor?: [
      {
        vendor_id: string;
        edv_vendor_id?: string;
        percentage?: number;
        amount?: number;
        name?: string;
        scheme_code?: string;
      },
    ],
    vendorgateway?: {
      easebuzz: boolean;
      cashfree: boolean;
    },
    easebuzzVendors?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
      },
    ],
    cashfreeVedors?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
      },
    ],
    isVBAPayment?: boolean,
    vba_account_number?: string,
    worldLine_vendors?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
        scheme_code?: string;
      },
    ],
    easebuzz_school_label?: string | null,
    razorpay_vendors?: [
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
      },
    ],
    razorpay_credentials?: {
      razorpay_id?: string | null;
      razorpay_secret?: string | null;
      razorpay_mid?: string | null;
      razorpay_account?: string | null;
    },
    gatepay_credentials?: {
      gatepay_mid?: string | null;
      gatepay_terminal_id?: string | null;
      gatepay_key?: string | null;
      gatepay_iv?: string | null;
    },
    isCFNonSeamless?: boolean,
    razorpay_seamless_credentials?: {
      razorpay_id?: string | null;
      razorpay_secret?: string | null;
      razorpay_mid?: string | null;
      razorpay_account?: string | null;
    },
    isSelectGateway?: boolean,
    isEasebuzzNonpartner?: boolean,
    easebuzz_non_partner_cred?: {
      easebuzz_salt: string;
      easebuzz_key: string;
      easebuzz_merchant_email: string;
      easebuzz_submerchant_id: string;
    },
    razorpay_partner?: boolean,

  ): Promise<{ url: string; request: CollectRequest }> {
    console.log(vendor, 'vendor to save in db');

    if (custom_order_id) {
      const count =
        await this.databaseService.CollectRequestModel.countDocuments({
          school_id,
          custom_order_id,
        });

      if (count > 0) {
        throw new ConflictException('OrderId must be unique');
      }
    }
    const gateway = clientId === 'edviron' ? Gateway.HDFC : Gateway.PENDING;
    console.log({ isSelectGateway });
    console.log(razorpay_vendors, 'vendors');

    const request = await new this.databaseService.CollectRequestModel({
      amount,
      callbackUrl,
      gateway: gateway,
      clientId,
      currency: currency || "INR",
      clientSecret,
      webHookUrl: webHook || null,
      disabled_modes,
      school_id,
      trustee_id,
      additional_data: JSON.stringify(additional_data),
      custom_order_id,
      req_webhook_urls,
      easebuzz_sub_merchant_id,
      ccavenue_merchant_id: ccavenue_merchant_id || null,
      ccavenue_access_code: ccavenue_access_code || null,
      ccavenue_working_key: ccavenue_working_key || null,
      pay_u_key: pay_u_key || null,
      pay_u_salt: pay_u_salt || null,
      ntt_data: {
        nttdata_id,
        nttdata_secret,
        nttdata_hash_req_key,
        nttdata_hash_res_key,
        nttdata_res_salt,
        nttdata_req_salt,
      },
      easebuzzVendors,
      cashfreeVedors,
      isVBAPayment: isVBAPayment || false,
      vba_account_number: vba_account_number || 'NA',
      worldline_vendors_info: worldLine_vendors,
      razorpay_vendors_info: razorpay_vendors,
      isSplitPayments: splitPayments || false,
      easebuzz_split_label: easebuzz_school_label,
      razorpay: {
        razorpay_id: razorpay_credentials?.razorpay_id || null,
        razorpay_secret: razorpay_credentials?.razorpay_secret || null,
        razorpay_mid: razorpay_credentials?.razorpay_mid || null,
        razorpay_account: razorpay_credentials?.razorpay_account || null,
      },
      isCFNonSeamless: isCFNonSeamless || false,
      razorpay_seamless: {
        razorpay_id: razorpay_seamless_credentials?.razorpay_id || null,
        razorpay_secret: razorpay_seamless_credentials?.razorpay_secret || null,
        razorpay_mid: razorpay_seamless_credentials?.razorpay_mid || null,
        razorpay_account: razorpay_seamless_credentials?.razorpay_account || null,
      },
      isMasterGateway: isSelectGateway || false
    }).save();

    await new this.databaseService.CollectRequestStatusModel({
      collect_id: request._id,
      status: PaymentStatus.PENDING,
      order_amount: request.amount,
      transaction_amount: request.amount,
      payment_method: null,
    }).save();

    let non_seamless_payment_links: any = {
      cashfree: null,
      easebuzz: null,
      edv_easebuzz: null,
      razorpay: null,
      ccavenue: null,
      pay_u: null,
      worldline: null,
      gatepay: null,
      nttdata: null,
      hdfc_razorpay: null,
      hdfc_smartgateway: null,
      edviron_pg: null,
    }
    // ATOM NTTDATA-NON SEAMLESS
    if (nttdata_id && nttdata_secret) {
      console.log('enter atom');
      const { url, collect_req } =
        await this.nttdataService.createOrder(request);
      setTimeout(
        () => {
          this.nttdataService.terminateOrder(collect_req._id.toString());
        },
        15 * 60 * 1000,
      );
      if (isSelectGateway) {
        const ntt_data_url = url;

        non_seamless_payment_links.nttdata = ntt_data_url;
        // return {
        //   url: `${process.env.PG_FRONTEND}/payments/select-gateway?collect_id=${request._id}`,
        //   request
        // };
      } else {
        return { url, request: collect_req };
      }
    }

    // RAZORPAY NON SEAMLESS
    if (
      razorpay_credentials?.razorpay_id &&
      razorpay_credentials?.razorpay_secret &&
      razorpay_credentials?.razorpay_mid
    ) {
      
      if (splitPayments && razorpay_vendors && razorpay_vendors.length > 0) {
        request.vendors_info = vendor
        await request.save()
        razorpay_vendors.map(async (info) => {
          const {
            vendor_id,
            percentage,
            amount,
            notes,
            name,
            linked_account_notes,
            on_hold,
            on_hold_until,
          } = info;
          let split_amount = 0;
          if (amount) {
            split_amount = amount;
          }
          if (percentage && percentage !== 0) {
            split_amount = (request.amount * percentage) / 100;
          }
          await new this.databaseService.VendorTransactionModel({
            vendor_id: vendor_id,
            amount: split_amount,
            collect_id: request._id,
            gateway: Gateway.EDVIRON_RAZORPAY,
            status: TransactionStatus.PENDING,
            trustee_id: request.trustee_id,
            school_id: request.school_id,
            custom_order_id: request.custom_order_id || '',
            name,
            razorpay_vendors: info,
          }).save();
        });
      }
      let collect_id = request._id.toString();
      if (razorpay_partner) {
        const { url, collect_req } =
          await this.razorpayNonseamlessService.createOrderV2(request);

        this.scheduleUpdate(15 * 60 * 1000, collect_id);
        this.scheduleUpdate(20 * 60 * 1000, collect_id);
        this.scheduleUpdate(60 * 60 * 1000, collect_id);

        return { url, request: collect_req };
      }

      const { url, collect_req } =
        await this.razorpayNonseamlessService.createOrder(request);
      this.scheduleUpdate(15 * 60 * 1000, collect_id);
      this.scheduleUpdate(20 * 60 * 1000, collect_id);
      this.scheduleUpdate(60 * 60 * 1000, collect_id);
      if (isSelectGateway) {
        non_seamless_payment_links.razorpay = url;
        // return {
        //   url: `${process.env.PG_FRONTEND}/payments/select-gateway?collect_id=${request._id}`,
        //   request
        // };
      } else {
        return { url, request: collect_req };
      }
    }

    // PAYU NON SEAMLESS
    if (pay_u_key && pay_u_salt) {
      setTimeout(
        async () => {
          try {
            await this.payuService.terminateOrder(request._id.toString());
          } catch (error) {
            console.log(error.message);
          }
        },
        15 * 60 * 1000,
      );

      if (isSelectGateway) {
        const payu_url = `${process.env.URL}/pay-u/redirect?collect_id=${request._id
          }&school_name=${school_name?.split(' ').join('_')}`;

        non_seamless_payment_links.pay_u = payu_url;
        // return {
        //   url: `${process.env.PG_FRONTEND}/payments/select-gateway?collect_id=${request._id}`,
        //   request
        // };
      } else {
        return {
          url: `${process.env.URL}/pay-u/redirect?collect_id=${request._id
            }&school_name=${school_name?.split(' ').join('_')}`,
          request,
        };
      }

    }

    // GATEPAY NON SEAMLESS
    if (
      gatepay_credentials?.gatepay_mid &&
      gatepay_credentials?.gatepay_key &&
      gatepay_credentials?.gatepay_iv &&
      gatepay_credentials.gatepay_terminal_id
    ) {
      console.log('gatepay enter9');
      if (!request.gatepay) {
        (request.gateway = Gateway.EDVIRON_GATEPAY),
          (request.gatepay = {
            gatepay_mid: gatepay_credentials?.gatepay_mid,
            gatepay_key: gatepay_credentials?.gatepay_key,
            gatepay_iv: gatepay_credentials?.gatepay_iv,
            gatepay_terminal_id: gatepay_credentials?.gatepay_terminal_id,
            txnId: '',
            token: '',
          });
      } else {
        (request.gateway = Gateway.EDVIRON_GATEPAY),
          (request.gatepay.gatepay_mid = gatepay_credentials?.gatepay_mid);
        request.gatepay.gatepay_key = gatepay_credentials?.gatepay_key;
        request.gatepay.gatepay_iv = gatepay_credentials?.gatepay_iv;
        request.gatepay.txnId = '';
        request.gatepay.token = '';
        request.gatepay.gatepay_terminal_id =
          gatepay_credentials?.gatepay_terminal_id;
      }

      await request.save();
      const { url, collect_req } =
        await this.gatepayService.createOrder(request);
      if (isSelectGateway) {
        non_seamless_payment_links.gatepay = url;
      } else {
        return { url, request: collect_req };
      }
    }

    // CCAVENUE NONSEAMMLESS
    if (ccavenue_merchant_id) {
      const transaction = await this.ccavenueService.createOrder(request);
      if (isSelectGateway) {
        non_seamless_payment_links.ccavenue = transaction.url;
      } else {
        return { url: transaction.url, request };
      }
    }

    // HDFC NON SEAMLESS
    if (hdfc_razorpay_id && hdfc_razorpay_secret && hdfc_razorpay_mid) {
      request.hdfc_razorpay_id = hdfc_razorpay_id;
      request.hdfc_razorpay_secret = hdfc_razorpay_secret;
      request.hdfc_razorpay_mid = hdfc_razorpay_mid;
      request.gateway = Gateway.EDVIRON_HDFC_RAZORPAY;

      await request.save(); // update the existing request

      await new this.databaseService.CollectRequestStatusModel({
        collect_id: request._id,
        status: PaymentStatus.PENDING,
        order_amount: request.amount,
        transaction_amount: request.amount,
        payment_method: null,
      }).save();
      const orderData = await this.hdfcRazorpay.createOrder(request);
      if (orderData.status === 'created') {
        request.hdfc_razorpay_order_id = orderData.id;
        await request.save();
      }

      if (isSelectGateway) {
        const hdfc_razorpay_url = `${process.env.URL}/hdfc-razorpay/redirect?order_id=${orderData.id
          }&collect_id=${request._id}&school_name=${school_name
            ?.split(' ')
            .join('_')}`;
        non_seamless_payment_links.hdfc_razorpay = hdfc_razorpay_url;
      } else {
        return {
          url: `${process.env.URL}/hdfc-razorpay/redirect?order_id=${orderData.id
            }&collect_id=${request._id}&school_name=${school_name
              ?.split(' ')
              .join('_')}`,
          request,
        };
      }

    }

    // WORLDLINE NON SEAMLESS
    if (
      worldline_merchant_id &&
      worldline_encryption_key &&
      worldline_encryption_iV &&
      worldline_scheme_code
    ) {
      if (splitPayments && worldLine_vendors && worldLine_vendors.length > 0) {
        worldLine_vendors.map(async (info) => {
          const { vendor_id, percentage, amount, name } = info;
          let split_amount = 0;
          if (amount) {
            split_amount = amount;
          }
          if (percentage && percentage !== 0) {
            split_amount = (request.amount * percentage) / 100;
          }
          await new this.databaseService.VendorTransactionModel({
            vendor_id: vendor_id,
            amount: split_amount,
            collect_id: request._id,
            gateway: Gateway.EDVIRON_WORLDLINE,
            status: TransactionStatus.PENDING,
            trustee_id: request.trustee_id,
            school_id: request.school_id,
            custom_order_id: request.custom_order_id || '',
            name,
            worldline_vendors_info: worldLine_vendors,
          }).save();
        });
      }

      if (!request.worldline) {
        request.worldline = {
          worldline_merchant_id: worldline_merchant_id,
          worldline_encryption_key: worldline_encryption_key,
          worldline_encryption_iV: worldline_encryption_iV,
          worldline_scheme_code: worldline_scheme_code,
          worldline_token: '',
        };
      } else {
        request.worldline.worldline_merchant_id = worldline_merchant_id;
        request.worldline.worldline_encryption_key = worldline_encryption_key;
        request.worldline.worldline_encryption_iV = worldline_encryption_iV;
        request.worldline.worldline_scheme_code = worldline_scheme_code;
        if (!request.worldline.worldline_token) {
          request.worldline.worldline_token = '';
        }
      }
      // request.gateway=Gateway.EDVIRON_WORLDLINE
      await request.save();

      const { url, collect_req } =
        // await this.worldLineService.createOrder(request);
        await this.worldLineService.SingleUrlIntegeration(request);

      try {
        request.payment_data = url;
        await request.save();
      } catch (e) {
        console.log(e);
      }
      if (isSelectGateway) {
        // console.log(isSelectGateway, 'isSelectGateway'); 

        non_seamless_payment_links.worldline = url;
      } else {
        console.log('false')
        return { url, request: collect_req };
      }
    }

    // HDFC SMART GATEWAY NON SEAMLESS
    if (
      smartgateway_customer_id &&
      smartgateway_merchant_id &&
      smart_gateway_api_key
    ) {
      request.smartgateway_customer_id = smartgateway_customer_id;
      request.smartgateway_merchant_id = smartgateway_merchant_id;
      request.smart_gateway_api_key = smart_gateway_api_key;
      await request.save();
      const data = await this.hdfcSmartgatewayService.createOrder(
        request,
        smartgateway_customer_id,
        smartgateway_merchant_id,
        smart_gateway_api_key,
      );
      if (isSelectGateway) {
        console.log('smart gateway');

        non_seamless_payment_links.hdfc_smartgateway = data?.url;
      } else {
        return { url: data?.url, request: data?.request };
      }
    }

    // CASHFREE NON PARTNER Mastergateway
    // if (isSelectGateway) {
    //   console.log('check cf master');
    //   console.log({ isCashfreeNonpartner, cashfree_credentials });

    //   if (isCashfreeNonpartner && cashfree_credentials) {

    //     const info = await this.cashfreeService.createOrderV2(
    //       amount,
    //       callbackUrl,
    //       school_id,
    //       trustee_id,
    //       disabled_modes,
    //       platform_charges,
    //       cashfree_credentials,
    //       request.clientId,
    //       request.clientSecret,
    //       webHook,
    //       additional_data,
    //       custom_order_id,
    //       req_webhook_urls,
    //       school_name,
    //       splitPayments,
    //       cashfreeVedors,
    //       vendorgateway,
    //       cashfreeVedors,
    //       isVBAPayment,
    //       vba_account_number,
    //     )
    //     console.log(info);

    //     non_seamless_payment_links.edv_vendor_id = info.url
    //     request.non_seamless_payment_links=non_seamless_payment_links
    //     await request.save()
    //     return {
    //       url: `${process.env.PG_FRONTEND}/payments/select-gateway?collect_id=${request._id}`, request
    //     };
    //   }
    // }

    // EASEBUZZ NON PARTNER MASTERGATEWAY
    if (isSelectGateway) {
      console.log({ isEasebuzzNonpartner }, easebuzz_non_partner_cred);

      if (
        isEasebuzzNonpartner &&
        easebuzz_non_partner_cred &&
        easebuzz_non_partner_cred.easebuzz_key &&
        easebuzz_non_partner_cred.easebuzz_merchant_email &&
        easebuzz_non_partner_cred.easebuzz_submerchant_id
      ) {
        console.log('easebuzz non partner');

        request.easebuzz_sub_merchant_id = easebuzz_non_partner_cred.easebuzz_submerchant_id,
          request.easebuzz_non_partner = true
        request.easebuzz_non_partner_cred = easebuzz_non_partner_cred
        await request.save()
        const schoolName = school_name || ' '
        const info = await this.easebuzzService.createOrderV2NonSplit(
          request,
          platform_charges,
          schoolName
        )
        non_seamless_payment_links.edv_easebuzz = info.collect_request_url

      }
    }

    // EASEBUZZ NONSEAMLESS and cashfree
    if (isSelectGateway) {
      if (request.clientId) {
        const transaction = (
          gateway === Gateway.PENDING
            ? await this.edvironPgService.collect(
              request,
              platform_charges,
              school_name,
              splitPayments || false,
              vendor,
              vendorgateway,
              easebuzzVendors,
              cashfreeVedors,
              easebuzz_school_label,
              isSelectGateway
            )
            : await this.hdfcService.collect(request)
        )!;
        console.log(transaction, 'p');

        await this.databaseService.CollectRequestModel.updateOne(
          {
            _id: request._id,
          },
          {
            payment_data: JSON.stringify(transaction.url),
          },
          { new: true },
        );
        non_seamless_payment_links.edviron_pg = transaction.url;
        request.non_seamless_payment_links = non_seamless_payment_links;
      }
      request.non_seamless_payment_links = non_seamless_payment_links
      await request.save()
      return {
        url: `${process.env.PG_FRONTEND}/select-gateway?collect_id=${request._id}`, request
      };
    }

    const transaction = (
      gateway === Gateway.PENDING
        ? await this.edvironPgService.collect(
          request,
          platform_charges,
          school_name,
          splitPayments || false,
          vendor,
          vendorgateway,
          easebuzzVendors,
          cashfreeVedors,
          easebuzz_school_label,
        )
        : await this.hdfcService.collect(request)
    )!;

    await this.databaseService.CollectRequestModel.updateOne(
      {
        _id: request._id,
      },
      {
        payment_data: JSON.stringify(transaction.url),
      },
      { new: true },
    );

    if (isSelectGateway) {
      return {
        url: `${process.env.PG_FRONTEND}/payments/select-gateway?collect_id=${request._id}`,
        request,
      };
    }
    return { url: transaction.url, request };
  }

  async posCollect(
    amount: Number,
    callbackUrl: string,
    school_id: string,
    trustee_id: string,
    machine_name?: string,
    platform_charges?: platformChange[],
    paytm_pos?: {
      paytmMid?: string;
      paytmTid?: string;
      channel_id?: string;
      paytm_merchant_key?: string;
      device_id?: string; //edviron
    },
    additional_data?: {},
    custom_order_id?: string,
    req_webhook_urls?: string[],
    school_name?: string,
  ) {
    const gateway =
      machine_name === 'PAYTM_POS' ? Gateway.PAYTM_POS : Gateway.MOSAMBEE_POS;
    const request = await this.databaseService.CollectRequestModel.create({
      amount,
      callbackUrl,
      gateway: gateway,
      req_webhook_urls,
      school_id,
      trustee_id,
      additional_data: JSON.stringify(additional_data),
      custom_order_id: custom_order_id || null,
      isPosTransaction: true,
    });

    await new this.databaseService.CollectRequestStatusModel({
      collect_id: request._id,
      status: PaymentStatus.PENDING,
      order_amount: request.amount,
      transaction_amount: request.amount,
      payment_method: null,
    }).save();

    if (machine_name === Gateway.PAYTM_POS) {
      if (paytm_pos) {
        request.paytmPos = paytm_pos;
        request.save();
      }
      return await this.posPaytmService.initiatePOSPayment(request);
    }
  }

  async sendCallbackEmail(collect_id: string) {
    const htmlToSend = `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
        .container {
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }
        .header {
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }
        .content {
          margin-top: 10px;
          font-size: 16px;
          color: #555;
        }
        .footer {
          margin-top: 20px;
          font-size: 14px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">Order Dropped Notification</div>
        <div class="content">
          <p>The user has dropped the order.</p>
          <p><strong>Order ID:</strong> ${collect_id}</p>
        </div>
        <div class="footer">
          <p>Thank you,</p>
          <p>Your Company Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

    const transporter = nodemailer.createTransport({
      pool: true,
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      },
    });

    const mailOptions = {
      from: 'noreply@edviron.com',
      to: 'rpbarmaiya@gmail.com',
      subject: `Edviron - User Dropped`,
      html: htmlToSend,
    };
    try {
      const info = await transporter.sendMail(mailOptions);

      return 'mail sent successfully';
    } catch (e) {
      console.log(e.message);
    }
  }

  async scheduleUpdate(delay: number, collect_id: string) {
    console.log(delay);
    setTimeout(async () => {
      try {
        await this.razorpayNonseamlessService.updateOrder(collect_id);
      } catch (error) {
        console.log(error.message);
      }
    }, delay);
  }
}
