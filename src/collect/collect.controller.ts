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
      additional_data?: {};
      student_id?: string;
      student_email?: string;
      student_name?: string;
      student_phone?: string;
      student_receipt?: string;
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
      additional_data,
      student_id,
      student_email,
      student_name,
      student_phone,
      student_receipt,
      school_id,
      trustee_id,
    } = body;

    console.log('additional data', additional_data);

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
          webHook,
          additional_data || {},
          student_id,
          student_email,
          student_name,
          student_phone,
          student_receipt,
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