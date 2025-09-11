import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { CollectService } from './collect.service';
import * as _jwt from 'jsonwebtoken';
import { sign } from '../utils/sign';
import { DatabaseService } from 'src/database/database.service';

type RangeCharge = {
  upto: number;
  charge_type: string;
  charge: number;
};

export type platformChange = {
  platform_type: string;
  payment_mode: string;
  rangeCharge: RangeCharge[];
};

@Controller('collect')
export class CollectController {
  constructor(
    private readonly collectService: CollectService,
    private readonly databaseService: DatabaseService,
  ) {}
  @Post('/')
  async collect(
    @Body()
    body: {
      amount: Number;
      callbackUrl: string;
      jwt: string;
      school_id: string;
      trustee_id: string;
      clientId?: string;
      clientSecret?: string;
      webHook?: string;
      disabled_modes?: string[];
      platform_charges: platformChange[];
      additional_data?: {};
      custom_order_id?: string;
      req_webhook_urls?: string[];
      school_name?: string;
      easebuzz_sub_merchant_id?: string;
      ccavenue_merchant_id?: string;
      ccavenue_access_code?: string;
      ccavenue_working_key?: string;
      smartgateway_merchant_id?: string | null;
      smartgateway_customer_id?: string | null;
      smart_gateway_api_key?: string | null;
      split_payments?: boolean;
      pay_u_key?: string | null;
      pay_u_salt: string | null;
      hdfc_razorpay_id?: string;
      hdfc_razorpay_secret?: string;
      isVBAPayment: boolean;
      vba_account_number: string;
      hdfc_razorpay_mid?: string;
      nttdata_id?: string | null;
      nttdata_secret?: string | null;
      nttdata_hash_req_key?: string | null;
      nttdata_hash_res_key?: string | null;
      nttdata_res_salt?: string | null;
      nttdata_req_salt?: string | null;
      easebuzz_school_label?: string | null;
      worldline_merchant_id?: string | null;
      worldline_encryption_key?: string | null;
      worldline_encryption_iV?: string | null;
      worldline_scheme_code?: string | null;
      isCFNonSeamless?: boolean;
      razorpay_credentials?: {
        razorpay_id?: string | null;
        razorpay_secret?: string | null;
        razorpay_mid?: string | null;
      };
      gatepay_credentials?: {
        gatepay_mid?: string | null;
        gatepay_terminal_id?: string | null;
        gatepay_key?: string | null;
        gatepay_iv?: string | null;
      };
      razorpay_seamless_credentials?: {
        razorpay_id?: string | null;
        razorpay_secret?: string | null;
        razorpay_mid?: string | null;
      };
      vendors_info?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
          scheme_code?: string;
        },
      ];
      worldLine_vendors?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
          scheme_code?: string;
        },
      ];
      vendorgateway?: {
        easebuzz: boolean;
        cashfree: boolean;
      };
      easebuzzVendors?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
        },
      ];
      cashfreeVedors?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
        },
      ];
      razorpay_vendors?: [
        {
          vendor_id: string;
          account?: string;
          percentage?: number;
          amount?: number;
          notes?: {
            branch?: string;
            name?: string;
          };
          linked_account_notes?: string[];
          on_hold?: boolean;
          on_hold_until?: Date;
        },
      ];
      isSelectGateway?:boolean,
      isEasebuzzNonpartner?:boolean,
    easebuzz_non_partner_cred?: {
        easebuzz_salt: string;
        easebuzz_key: string;
        easebuzz_merchant_email: string;
        easebuzz_submerchant_id: string;
      }
    },
  ) {
    const {
      amount,
      callbackUrl,
      jwt,
      webHook,
      clientId,
      clientSecret,
      disabled_modes,
      platform_charges,
      additional_data,
      school_id,
      trustee_id,
      custom_order_id,
      req_webhook_urls,
      school_name,
      easebuzz_sub_merchant_id,
      ccavenue_access_code,
      ccavenue_working_key,
      ccavenue_merchant_id,
      smartgateway_merchant_id,
      smartgateway_customer_id,
      smart_gateway_api_key,
      split_payments,
      vendors_info,
      pay_u_key,
      pay_u_salt,
      hdfc_razorpay_id,
      hdfc_razorpay_secret,
      hdfc_razorpay_mid,
      nttdata_id,
      nttdata_secret,
      nttdata_hash_req_key,
      nttdata_hash_res_key,
      nttdata_res_salt,
      nttdata_req_salt,
      isVBAPayment,
      vendorgateway,
      easebuzzVendors,
      cashfreeVedors,
      easebuzz_school_label,
      worldline_merchant_id,
      worldline_encryption_key,
      worldline_encryption_iV,
      worldline_scheme_code,
      vba_account_number,
      worldLine_vendors,
      razorpay_vendors,
      razorpay_credentials,
      gatepay_credentials,
      isCFNonSeamless,
      razorpay_seamless_credentials,
      isSelectGateway,
      isEasebuzzNonpartner,
      easebuzz_non_partner_cred
    } = body;

    if (!jwt) throw new BadRequestException('JWT not provided');
    if (!amount) throw new BadRequestException('Amount not provided');
    if (!callbackUrl)
      throw new BadRequestException('Callback url not provided');
    try {
      let decrypted = _jwt.verify(jwt, process.env.KEY!) as any;

      // if (
      //   decrypted.amount !== amount || decrypted.callbackUrl !== callbackUrl
      // ) {
      //   throw new ForbiddenException('Request forged');
      // }
      return sign(
        await this.collectService.collect(
          amount,
          callbackUrl,
          school_id,
          trustee_id,
          disabled_modes,
          platform_charges,
          clientId,
          clientSecret,
          webHook,
          additional_data || {},
          custom_order_id,
          req_webhook_urls,
          school_name,
          easebuzz_sub_merchant_id,
          ccavenue_merchant_id,
          ccavenue_access_code,
          ccavenue_working_key,
          smartgateway_customer_id,
          smartgateway_merchant_id,
          smart_gateway_api_key,
          split_payments || false,
          pay_u_key,
          pay_u_salt,
          hdfc_razorpay_id,
          hdfc_razorpay_secret,
          hdfc_razorpay_mid,
          nttdata_id,
          nttdata_secret,
          nttdata_hash_req_key,
          nttdata_hash_res_key,
          nttdata_res_salt,
          nttdata_req_salt,
          worldline_merchant_id,
          worldline_encryption_key,
          worldline_encryption_iV,
          worldline_scheme_code,
          vendors_info,
          vendorgateway,
          easebuzzVendors,
          cashfreeVedors,
          isVBAPayment,
          vba_account_number,
          worldLine_vendors,
          easebuzz_school_label,
          razorpay_vendors,
          razorpay_credentials,
          gatepay_credentials,
          isCFNonSeamless,
          razorpay_seamless_credentials,
          isSelectGateway,
          isEasebuzzNonpartner,
          easebuzz_non_partner_cred
        ),
      );
    } catch (e) {
      console.log(e);
      if (e.name === 'JsonWebTokenError')
        throw new UnauthorizedException('JWT invalid');
      throw e;
    }
  }

  @Post('/pos')
  async posCollect(
    @Body()
    body: {
      amount: Number;
      callbackUrl: string;
      jwt: string;
      school_id: string;
      trustee_id: string;
      machine_name?: string;
      platform_charges?: platformChange[];
      paytm_pos?: {
        paytmMid?: string;
        paytmTid?: string;
        channel_id?: string;
        paytm_merchant_key?: string;
        device_id?: string; //edviron
      };
      additional_data?: {};
      custom_order_id?: string;
      req_webhook_urls?: string[];
      school_name?: string;
    },
  ) {
    const {
      amount,
      callbackUrl,
      jwt,
      school_id,
      trustee_id,
      machine_name,
      paytm_pos,
      platform_charges,
      additional_data,
      custom_order_id,
      req_webhook_urls,
      school_name,
    } = body;

    if (!jwt) throw new BadRequestException('JWT not provided');
    if (!amount) throw new BadRequestException('Amount not provided');
    if (!callbackUrl)
      throw new BadRequestException('Callback url not provided');

    try {
      let decrypted = _jwt.verify(jwt, process.env.KEY!) as any;
      console.log(decrypted, 'decrypted pos collect');
      return sign(
        await this.collectService.posCollect(
          amount,
          callbackUrl,
          school_id,
          trustee_id,
          machine_name,
          platform_charges,
          paytm_pos,
          additional_data,
          custom_order_id,
          req_webhook_urls,
          school_name,
        ),
      );
    } catch (e) {
      console.log(e);
      if (e.name === 'JsonWebTokenError')
        throw new UnauthorizedException('JWT invalid');
      throw e;
    }
  }

  @Get('callback')
  async callbackUrl(
    @Res() res: any,
    @Query('collect_id')
    collect_id: string,
  ) {
    const collect_request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collect_request) {
      throw new BadRequestException('tranaction missing');
    }
    // await this.collectService.sendCallbackEmail(collect_id); //enable later
    let callbackUrl = new URL(collect_request.callbackUrl);
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
    callbackUrl.searchParams.set('status', 'cancelled');
    callbackUrl.searchParams.set('reason', 'dropped-by-user');
    res.redirect(callbackUrl.toString());
    // const callback_url = `${collect_request?.callbackUrl}&status=cancelled&reason=dropped-by-user`;
    // res.redirect(callback_url);
  }
}
