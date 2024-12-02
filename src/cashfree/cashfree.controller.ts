import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as jwt from 'jsonwebtoken';
import { CashfreeService } from './cashfree.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
@Controller('cashfree')
export class CashfreeController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cashfreeService: CashfreeService,
  ) {}
  @Post('/refund')
  async initiateRefund(@Body() body: any) {
    const { collect_id, amount, refund_id } = body;
    console.log(body);

    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new Error('Collect Request not found');
    }
    const axios = require('axios');
    const data = {
      refund_speed: 'STANDARD',
      refund_amount: amount,
      refund_id: refund_id,
    };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/refunds`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': request.clientId || null,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
      data: data,
    };
    try {
      const response = await axios.request(config);
      console.log(response);

      return response.data;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Get('/upi-payment')
  async getUpiPaymentInfoUrl(@Req() req: any) {
    const { token, collect_id } = req.query;
    let decrypted = jwt.verify(token, process.env.KEY!) as any;
    if (decrypted.collect_id != collect_id) {
      throw new BadRequestException('Invalid token');
    }
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new BadRequestException('Collect Request not found');
    }

    // request.gateway=Gateway.EDVIRON_PG
    await request.save()
    const cashfreeId = request.paymentIds.cashfree_id;
    if (!cashfreeId) {
      throw new BadRequestException('Error in Getting QR Code');
    }
    let intentData = JSON.stringify({
      payment_method: {
        upi: {
          channel: 'link',
        },
      },
      payment_session_id: cashfreeId,
    });

    let qrCodeData = JSON.stringify({
      payment_method: {
        upi: {
          channel: 'qrcode',
        },
      },
      payment_session_id: cashfreeId,
    });
    let upiConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/sessions`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
      },
      data: intentData,
    };

    let qrCodeConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/sessions`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
      },
      data: qrCodeData,
    };

    const axios = require('axios');
    try {
      const { data: upiIntent } = await axios.request(upiConfig);
      const { data: qrCode } = await axios.request(qrCodeConfig);

      const intent = upiIntent.data.payload.default;
      const qrCodeUrl = qrCode.data.payload.qrcode;

      const qrBase64 = qrCodeUrl.split(',')[1];

      request.isQRPayment = true;
      await request.save();

      // terminate order after 10 min
      setTimeout(async () => {
        try {
          await this.cashfreeService.terminateOrder(collect_id);
          console.log(`Order ${collect_id} terminated after 10 minutes`);
        } catch (error) {
          console.error(`Failed to terminate order ${collect_id}:`, error);
        }
      }, 600000);

      return { intentUrl: intent, qrCodeBase64: qrBase64, collect_id };
    } catch (e) {
      console.log(e);
      if(e.response?.data?.message && e.response?.data?.code){
        if(e.response?.data?.message && e.response?.data?.code === 'order_inactive'){
          throw new BadRequestException('Order expired')
        }
        throw new BadRequestException(e.response.data.message)
      }
      throw new BadRequestException(e.message);
    }
  }

  @Post('/settlements-transactions')
  async getSettlementsTransactions(
    @Body() body:{limit:number,cursor:string | null},
    @Req() req: any) {
    const {utr,client_id,token}=req.query
    try{
      const limit = body.limit || 40
      return await this.cashfreeService.getTransactionForSettlements(utr,client_id,limit,body.cursor);
    }catch(e){
      // console.log(e)
      throw new BadRequestException(e.message)
    }
  }
}
