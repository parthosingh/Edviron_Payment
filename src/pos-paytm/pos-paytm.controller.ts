import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PosPaytmService } from './pos-paytm.service';
import { platformChange } from 'src/collect/collect.controller';
import * as _jwt from 'jsonwebtoken';
import { DatabaseService } from 'src/database/database.service';
@Controller('pos-paytm')
export class PosPaytmController {
  constructor(
    private readonly posPaytmService: PosPaytmService,
    private readonly databaseService: DatabaseService,
  ) {}
  @Post('/initiate-payment')
  async initiatePayment(
    @Body()
    body: {
      amount: Number;
      callbackUrl: string;
      jwt: string;
      school_id: string;
      trustee_id: string;
      paytm_pos: {
        paytmMid: string;
        paytmTid: string;
        channel_id: string;
        paytm_merchant_key: string;
        device_id: string; //edviron
      };
      platform_charges: platformChange[];
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
      paytm_pos,
      platform_charges,
      additional_data,
      custom_order_id,
      req_webhook_urls,
      school_name,
    } = body;
    if (!jwt) throw new BadRequestException('JWT not provided');
    if (!amount) throw new BadRequestException('Amount not provided');
    try {
      const decrypt = _jwt.verify(jwt, process.env.KEY!) as any;
      if (decrypt.school_id !== school_id) {
        throw new BadRequestException(`Request Fordge`);
      }
      return await this.posPaytmService.collectPayment(
        amount,
        callbackUrl,
        school_id,
        trustee_id,
        paytm_pos,
        platform_charges,
        additional_data,
        custom_order_id,
        req_webhook_urls,
        school_name,
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('callback')
  async PosCallback(@Body() body: any) {
    try{

      await this.databaseService.WebhooksModel.create({
        gateway: 'POS_PAYTM',
        body: JSON.stringify(body),
      });
    }catch(e){
      await this.databaseService.WebhooksModel.create({
        gateway: 'POS_PAYTM',
        body: 'Error in callback saving',
      });
    }

    return true;
  }

  @Get('status')
  async checkStatus(
    @Query('collect_id') collect_id:string
  ){
    return await this.posPaytmService.getTransactionStatus(collect_id)
  }

  
  @Post('refund')
  async getRefund(
    @Query('collect_id') collect_id:string
  ){
    // take refund amount from user 
    // refund amount cannot be greater than order amount 
    return await this.posPaytmService.refund(collect_id)
  }
}
