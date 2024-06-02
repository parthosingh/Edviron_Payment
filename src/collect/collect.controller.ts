import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { CollectService } from './collect.service';
import * as _jwt from 'jsonwebtoken';
import { sign } from '../utils/sign';

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
  constructor(private readonly collectService: CollectService) {}
  @Post('/')
  async collect(
    @Body()
    body: {
      amount: Number;
      callbackUrl: string;
      jwt: string;
      clientId: string;
      clientSecret: string;
      school_id: string;
      trustee_id: string;
      webHook?: string;
      disabled_modes?: string[];
      platform_charges: platformChange[];
      additional_data?: {};
      custom_order_id?: string;
      req_webhook_urls?: string[];
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
    } = body;

    if (!jwt) throw new BadRequestException('JWT not provided');
    if (!amount) throw new BadRequestException('Amount not provided');
    if (!callbackUrl)
      throw new BadRequestException('Callback url not provided');
    try {
      console.log(disabled_modes);
      let decrypted = _jwt.verify(jwt, process.env.KEY!) as any;
      if (
        JSON.stringify({
          ...JSON.parse(JSON.stringify(decrypted)),
          iat: undefined,
          exp: undefined,
        }) !==
        JSON.stringify({
          amount,
          callbackUrl,
          clientId,
          clientSecret,
        })
      ) {
        throw new ForbiddenException('Request forged');
      }
      return sign(
        await this.collectService.collect(
          amount,
          callbackUrl,
          clientId,
          clientSecret,
          school_id,
          trustee_id,
          disabled_modes,
          platform_charges,
          webHook,
          additional_data || {},
          custom_order_id,
          req_webhook_urls,
        ),
      );
    } catch (e) {
      console.log(e);
      if (e.name === 'JsonWebTokenError')
        throw new UnauthorizedException('JWT invalid');
      throw e;
    }
  }
}
