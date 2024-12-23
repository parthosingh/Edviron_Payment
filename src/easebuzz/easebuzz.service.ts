import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest, Gateway } from 'src/database/schemas/collect_request.schema';
import { calculateSHA512Hash } from 'src/utils/sign';
import axios from 'axios';

@Injectable()
export class EasebuzzService {
  constructor(private readonly databaseService: DatabaseService) {}

  async easebuzzCheckStatus(
    collect_request_id: String,
    collect_request: CollectRequest,
  ) {
    const amount = parseFloat(collect_request.amount.toString()).toFixed(1);

    const axios = require('axios');
    let hashData =
      process.env.EASEBUZZ_KEY +
      '|' +
      collect_request_id +
      '|' +
      amount.toString() +
      '|' +
      'noreply@edviron.com' +
      '|' +
      '9898989898' +
      '|' +
      process.env.EASEBUZZ_SALT;

    let hash = await calculateSHA512Hash(hashData);
    const qs = require('qs');

    const data = qs.stringify({
      txnid: collect_request_id,
      key: process.env.EASEBUZZ_KEY,
      amount: amount,
      email: 'noreply@edviron.com',
      phone: '9898989898',
      hash: hash,
    });

    const config = {
      method: 'POST',
      url: `https://dashboard.easebuzz.in/transaction/v1/retrieve`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: data,
    };

    const { data: statusRes } = await axios.request(config);
    console.log(statusRes);;
    
    
    return statusRes;
  }

  async statusResponse(requestId: string, collectReq: CollectRequest) {
    let statusResponse = await this.easebuzzCheckStatus(requestId,collectReq);
    if (statusResponse.msg.mode === 'NA') {
      console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
      statusResponse = await this.easebuzzCheckStatus(`upi_${requestId}`,collectReq);
    } 

    return statusResponse;
  }

  async initiateRefund(collect_id:string,refund_amount:number,refund_id:string) {
   const collectRequest=await this.databaseService.CollectRequestModel.findById(collect_id)
    if (!collectRequest) {
      throw new BadRequestException('Collect Request not found');
    }

    const transaction = await this.statusResponse(collect_id,collectRequest)
    console.log(transaction.msg.easepayid);
    const order_id=transaction.msg.easepayid
    if(!order_id){
      throw new BadRequestException('Order ID not found');
    }
    

    // key|merchant_refund_id|easebuzz_id|refund_amount|salt
    const hashStringV2 = `${
      process.env.EASEBUZZ_KEY
    }|${refund_id}|${order_id}|${(refund_amount)
      .toFixed(1)}|${process.env.EASEBUZZ_SALT}`;

    let hash2 = await calculateSHA512Hash(hashStringV2);
    const data2 = {
      key: process.env.EASEBUZZ_KEY,
      merchant_refund_id: refund_id,
      easebuzz_id: order_id,
      refund_amount: (refund_amount).toFixed(1),
      // refund_amount: 1.0.toFixed(1),
      hash: hash2,
      // amount: parseFloat(total_amount).toFixed(2),
      // email: email,
      // phone: phone,
      // salt: process.env.EASEBUZZ_SALT,
    };
    const config = {
      method: 'POST',
      url: `https://dashboard.easebuzz.in/transaction/v2/refund`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: data2,
    };
    try {
      console.log('initiating refund with easebuzz');
      
      const response = await axios(config);
      console.log(response.data);
      // console.log({
      //   hashString,
      //   hash,
      // });
      return response.data;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async checkRefundSttaus(
    collect_id:string
  ){
    const collectRequest=await this.databaseService.CollectRequestModel.findById(collect_id)
    if (!collectRequest) {
      throw new BadRequestException('Collect Request not found');
    }

    const transaction = await this.statusResponse(collect_id,collectRequest)
    console.log(transaction.msg.easepayid);
    const order_id=transaction.msg.easepayid
    if(!order_id){
      throw new BadRequestException('Order ID not found');
    }
    const hashString = `${
      process.env.EASEBUZZ_KEY
    }|${order_id}|${process.env.EASEBUZZ_SALT}`;

    let hash = await calculateSHA512Hash(hashString);
    const data = {
      key: process.env.EASEBUZZ_KEY,
      easebuzz_id: order_id,
      hash: hash,
    };

    const config = {
      method: 'POST',
      url: `https://dashboard.easebuzz.in/refund/v1/retrieve`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: data,
    }; 
    try {
      console.log('checking refund status with easebuzz');
      
      const response = await axios(config);
      console.log(response.data);
      // console.log({
      //   hashString,
      //   hash,
      // });
      return response.data;
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message)
    }
  }

  async getQrBase64(collect_id: string){
    try{

      const collectRequest=await this.databaseService.CollectRequestModel.findById(collect_id)
      if (!collectRequest) {
        throw new BadRequestException('Collect Request not found');
      }
      collectRequest.gateway=Gateway.EDVIRON_EASEBUZZ
      await collectRequest.save();
      const upiIntentUrl = collectRequest.deepLink
      var QRCode = require('qrcode')
      const qrCodeBase64 = await QRCode.toDataURL(upiIntentUrl, {
        margin: 2, 
        width: 300,
      });
      return { intentUrl: upiIntentUrl, qrCodeBase64: qrCodeBase64, collect_id }
    }catch(e){
      console.log(e.message)
    }

  }
} 
