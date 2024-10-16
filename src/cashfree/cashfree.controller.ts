import { BadRequestException, Body, Controller, Post, Query, Req } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Controller('cashfree')
export class CashfreeController {
  constructor(private readonly databaseService: DatabaseService) {}
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
    try{

        const response = await axios.request(config);
        console.log(response);
        
        return response.data;
    }catch(e){
        console.log(e);
        
        throw new BadRequestException(e.message)
    }
  }

}
