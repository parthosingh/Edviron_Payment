import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CheckStatusService } from './check-status.service';
import { sign } from 'src/utils/sign';
import * as _jwt from 'jsonwebtoken';

@Controller('check-status')
export class CheckStatusController {
  constructor(private readonly checkStatusService: CheckStatusService) {}
  @Get('/')
  async checkStatus(
    @Query('transactionId') transactionId: String,
    @Query('jwt') jwt: string,
  ) {
    if (!jwt) throw new BadRequestException('JWT is required');
    const decrypted = _jwt.verify(jwt, process.env.KEY!) as {
      transactionId: string;
    };
    if (
      JSON.stringify({
        transactionId: decrypted.transactionId,
      }) !==
      JSON.stringify({
        transactionId,
      })
    ) {
      throw new Error('Request forged');
    } else {
      const status = await this.checkStatusService.checkStatus(transactionId);
      return sign(status);
    }
  }

  @Get('/custom-order')
  async checkCustomOrderStatus(
    @Query('transactionId') transactionId: String,
    @Query('jwt') jwt: string,
  ) {
    if (!jwt) throw new BadRequestException('JWT is required');
    const decrypted = _jwt.verify(jwt, process.env.KEY!) as {
      transactionId: string;
      trusteeId: string
    };
    console.log(decrypted.transactionId, transactionId);

    if (
      JSON.stringify({
        transactionId: decrypted.transactionId,
      }) !==
      JSON.stringify({
        transactionId,
      })
    ) {
      throw new Error('Request forged');
    } else {
      const status =
        await this.checkStatusService.checkStatusByOrderId(transactionId, decrypted.trusteeId);
      return sign(status);
    }
  }
}
