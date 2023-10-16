import { Injectable } from '@nestjs/common';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import * as api from 'api';
import { Transaction } from 'src/types/transaction';
import { ObjectId } from 'mongoose';
import axios from 'axios';
// const phonepe = api('@phonepe-docs/v1#3dxznuf1gljiezluv');
import * as crypto from 'crypto';
import { generate } from 'rxjs';
import { TransactionStatus } from 'src/types/transactionStatus';

function encodeBase64(str: string) {
    const string = String(str);
    const buffer = Buffer.from(string);
    const base64 = buffer.toString('base64');
    return base64;
}

function sha256(str: string) {
  const string = String(str);
  const hash = crypto.createHash('sha256');
  hash.update(string);
  const digest = hash.digest('hex');
  return digest;
}

function generateXVerify(apiEndpoint: string, encodedRequest: string) {
  return sha256(encodedRequest+apiEndpoint+process.env.PHONEPE_SALT)+"###"+process.env.PHONEPE_SALT_INDEX;
}



@Injectable()
export class PhonepeService {
    
    async collect(request: CollectRequest): Promise<Transaction>{
        const apiEndpoint = "/pg/v1/pay";
        const payAPIRequest = {
            "merchantId": "EDVIRONONLINE",
            "merchantTransactionId": request._id,
            "merchantUserId": "user_"+request._id,
            "amount": request.amount*100,
            "redirectUrl": process.env.URL+"/phonepe/redirect",
            "redirectMode": "POST",
            "callbackUrl": process.env.URL+"/phonepe/callback",
            "mobileNumber": "9999999999",
            "paymentInstrument": {
              "type": "PAY_PAGE"
            }
        }
        console.log("payAPIRequest: ", payAPIRequest);
        const encodedRequest = encodeBase64(JSON.stringify(payAPIRequest));
        const xVerify = generateXVerify(apiEndpoint, encodedRequest);
        let data = JSON.stringify({
            "request": encodedRequest
          });
          
          let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://api.phonepe.com/apis/hermes/pg/v1/pay',
            headers: { 
              'Content-Type': 'application/json', 
              'accept': 'application/json', 
              'X-VERIFY': xVerify
            },
            data : data
          };
          
          const res = await axios.request(config);
        return {
            url: res.data.data.instrumentResponse.redirectInfo.url
        }
    }

    async checkStatus(transactionId: String): Promise<{status: TransactionStatus, amount: number}>{
        const apiEndpoint = "/pg/v1/pay";
        const xVerify = sha256("/pg/v1/status/EDVIRONONLINE/"+transactionId+process.env.PHONEPE_SALT)+"###"+process.env.PHONEPE_SALT_INDEX;
        console.log(xVerify);
          let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: "https://api.phonepe.com/apis/hermes/pg/v1/status/EDVIRONONLINE/"+transactionId,
            headers: { 
              'Content-Type': 'application/json', 
              'accept': 'application/json', 
              'X-VERIFY': xVerify,
              'X-MERCHANT-ID': 'EDVIRONONLINE'
            },
          };
          
          const res = await axios.request(config);
          console.log(res.data)
          return {status: res.data.data.state, amount: res.data.data.amount};
    }
}
