import { BadRequestException, Body, Controller, ForbiddenException, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { CollectService } from './collect.service';
import * as _jwt from "jsonwebtoken";
import {sign} from "../utils/sign";
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
      webHook?: string;
    },
  ) {
    const { amount, callbackUrl, jwt, webHook, clientId, clientSecret } = body;

    if (!jwt) throw new BadRequestException('JWT not provided');
    if (!amount) throw new BadRequestException('Amount not provided');
    if (!callbackUrl)
      throw new BadRequestException('Callback url not provided');
    try {
      let decrypted = _jwt.verify(jwt, process.env.KEY!) as any;
      //TODO check for webHook Url in json if coming from jwt
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
    } catch (e) {
      console.log(e);
      if (e.name === 'JsonWebTokenError')
        throw new UnauthorizedException('JWT invalid');
      throw e;
    }
    return sign(
      await this.collectService.collect(
        amount,
        callbackUrl,
        clientId,
        clientSecret,
        webHook,
      ),
    );
  }
}
