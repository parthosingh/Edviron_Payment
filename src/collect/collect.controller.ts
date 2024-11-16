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
      split_payments?: boolean;
      vendors_info?:[{ vendor_id: string; percentage?: number; amount?: number,name?:string }]
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
      split_payments,
      vendors_info,
    } = body;

    if (!jwt) throw new BadRequestException('JWT not provided');
    if (!amount) throw new BadRequestException('Amount not provided');
    if (!callbackUrl)
      throw new BadRequestException('Callback url not provided');
    try {
      console.log(disabled_modes);
      let decrypted = _jwt.verify(jwt, process.env.KEY!) as any;
      console.log(decrypted);
      
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
          split_payments || false,
          vendors_info, 
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
    if(!collect_request){
      throw new BadRequestException('tranaction missing')
    }
      let callbackUrl = new URL(collect_request.callbackUrl);
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
    callbackUrl.searchParams.set('status', 'cancelled');
    callbackUrl.searchParams.set('reason', 'dropped-by-user');
    res.redirect(callbackUrl.toString());

    // const callback_url = `${collect_request?.callbackUrl}&status=cancelled&reason=dropped-by-user`;
    // res.redirect(callback_url);
  }
}
