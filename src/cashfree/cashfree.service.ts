import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class CashfreeService {
  constructor(private readonly databaseService: DatabaseService) {}
  async initiateRefund(refund_id: string, amount: number, collect_id: string) {
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new Error('Collect Request not found');
    }
    console.log('initiating refund with cashfree');

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
      console.log(response.data);

      return response.data;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async terminateOrder(collect_id: string) {
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new Error('Collect Request not found');
    }

    let config = {
      method: 'patch',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': request.clientId,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
      data: { order_status: 'TERMINATED' },
    };
    console.log(config);
    
    try {
      const response = await axios.request(config);
      return response.data;
    } catch (e) {
      console.log(e.message);
    }
  }
}
