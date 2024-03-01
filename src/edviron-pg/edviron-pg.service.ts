import { BadRequestException, Injectable } from '@nestjs/common';
import { CollectRequest } from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus } from '../types/transactionStatus';

@Injectable()
export class EdvironPgService implements GatewayService {
  constructor() {}
  async collect(request: CollectRequest): Promise<Transaction | undefined> {
    try {
      const axios = require('axios');
      let data = JSON.stringify({
        customer_details: {
          customer_id: '7112AAA812234',
          customer_phone: '9898989898',
        },
        order_currency: 'INR',
        order_amount: request.amount.toFixed(2),
        order_id: request._id,
        order_meta: {
          return_url:
            process.env.URL +
            '/edviron-pg/callback?collect_request_id=' +
            request._id,
        },
      });

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.CASHFREE_ENDPOINT}/pg/orders`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': request.clientId,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data: data,
      };

            const { data: cashfreeRes } = await axios.request(config);
            const disabled_modes_string = request.disabled_modes.map((mode) => `${mode}=false`).join("&");
        return {
            url: process.env.URL + "/edviron-pg/redirect?session_id=" + cashfreeRes.payment_session_id + "&collect_request_id=" + request._id + "&amount=" + request.amount.toFixed(2) +"&" + disabled_modes_string,
        }
        } catch(err){
            console.log(err);
            if(err.name==="AxiosError") throw new BadRequestException("Invalid client id or client secret "+JSON.stringify(err.response.data));
            console.log(err);
        }
        
    
  }
  async checkStatus(
    collect_request_id: String,
    collect_request: CollectRequest,
  ): Promise<{ status: TransactionStatus; amount: number; details?: any }> {
    const axios = require('axios');

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/` + collect_request_id,
      headers: {
        accept: 'application/json',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': collect_request.clientId,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
    };

    const { data: cashfreeRes } = await axios.request(config);
    console.log({ cashfreeRes });

    const order_status_to_transaction_status_map = {
      ACTIVE: TransactionStatus.PENDING,
      PAID: TransactionStatus.SUCCESS,
      EXPIRED: TransactionStatus.FAILURE,
      TERMINATED: TransactionStatus.FAILURE,
      TERMINATION_REQUESTED: TransactionStatus.FAILURE,
    };

    console.log({ cashfreeRes });
    return {
      status:
        order_status_to_transaction_status_map[
          cashfreeRes.order_status as keyof typeof order_status_to_transaction_status_map
        ],
      amount: cashfreeRes.order_amount,
      details: {
        payment_methods: cashfreeRes.order_meta.payment_methods,
      },
    };
  }
}
