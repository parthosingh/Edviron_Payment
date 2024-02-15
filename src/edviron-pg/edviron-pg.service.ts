import { BadRequestException, Injectable } from '@nestjs/common';
import { CollectRequest } from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus } from '../types/transactionStatus';

@Injectable()
export class EdvironPgService implements GatewayService {
    constructor() { }
    async collect(request: CollectRequest): Promise<Transaction | undefined> {
        try{
            const axios = require('axios');
        let data = JSON.stringify({
            "customer_details": {
                "customer_id": "7112AAA812234",
                "customer_phone": "9898989898"
            },
            "order_currency": "INR",
            "order_amount": request.amount,
            "order_id": request._id,
            "order_meta": {
                "return_url": process.env.URL + "/edviron-pg/callback?collect_request_id=" + request._id
            },
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders`,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-client-id': request.clientId,
                'x-client-secret': request.clientSecret
            },
            data: data
        };

        const { data: cashfreeRes } = await axios.request(config);
        console.log({cashfreeRes})
        return {
            url: process.env.URL + "/edviron-pg/redirect?session_id=" + cashfreeRes.payment_session_id + "&collect_request_id=" + request._id + "&amount=" + request.amount
        }
        } catch(err){
            if(err.name==="AxiosError") throw new BadRequestException("Invalid client id or client secret");
            console.log(err);
        }
        
    }
    async checkStatus(collect_request_id: String, collect_request: CollectRequest): Promise<{ status: TransactionStatus; amount: number; details?: any }> {
        const axios = require('axios');
        
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/` + collect_request_id,
            headers: {
                'accept': 'application/json',
                'x-api-version': '2023-08-01',
                'x-client-id': collect_request.clientId,
                'x-client-secret': collect_request.clientSecret
            }
        };


        const { data: cashfreeRes } = await axios.request(config);

        const order_status_to_transaction_status_map = {
            "ACTIVE": TransactionStatus.PENDING,
            "PAID": TransactionStatus.SUCCESS,
            "EXPIRED": TransactionStatus.FAILURE,
            "TERMINATED": TransactionStatus.FAILURE,
            "TERMINATION_REQUESTED": TransactionStatus.FAILURE
        }

        console.log({cashfreeRes})
        return {
            status: order_status_to_transaction_status_map[cashfreeRes.order_status as keyof typeof order_status_to_transaction_status_map],
            amount: cashfreeRes.order_amount,
            details: {
                payment_methods: cashfreeRes.order_meta.payment_methods
            }
        }
    }
}
