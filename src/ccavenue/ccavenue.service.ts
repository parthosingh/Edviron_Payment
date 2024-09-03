import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { GatewayService } from 'src/types/gateway.type';
import { Transaction } from 'src/types/transaction';
import { TransactionStatus } from 'src/types/transactionStatus';
import { createCipheriv, createDecipheriv, createHash } from 'crypto';
import * as qs from 'qs';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class CcavenueService {
  constructor(private readonly databaseService: DatabaseService) {}
  encrypt(plainText: string, workingKey: string) {
    const m = createHash('md5');
    m.update(workingKey);
    const key = m.digest();

    const iv =
      '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
    const cipher = createCipheriv('aes-128-cbc', key, iv);

    let encoded = cipher.update(plainText, 'utf8', 'hex');
    encoded += cipher.final('hex');
    return encoded;
  }

  decrypt(encText: string, workingKey: string) {
    const m = createHash('md5');
    m.update(workingKey);

    const key = m.digest();
    const iv =
      '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
    const decipher = createDecipheriv('aes-128-cbc', key, iv);

    let decoded = decipher.update(encText, 'hex', 'utf8');
    decoded += decipher.final('utf8');
    return decoded;
  }

  ccavRequestHandler(
    p_merchant_id: string,
    p_order_id: string,
    p_currency: string,
    p_amount: string,
    p_redirect_url: string,
    p_cancel_url: string,
    p_language: string,
    p_billing_name: string,
    p_billing_address: string,
    p_billing_city: string,
    p_billing_state: string,
    p_billing_zip: string,
    p_billing_country: string,
    p_billing_tel: string,
    p_billing_email: string,
    p_delivery_name: string,
    p_delivery_address: string,
    p_delivery_city: string,
    p_delivery_state: string,
    p_delivery_zip: string,
    p_delivery_country: string,
    p_delivery_tel: string,
    p_merchant_param1: string,
    p_merchant_param2: string,
    p_merchant_param3: string,
    p_merchant_param4: string,
    p_merchant_param5: string,
    p_promo_code: string,
    p_customer_identifier: string,
    ccavenue_working_key: string,
    ccavenue_access_code: string,
  ) {
    const merchant_data =
      'merchant_id=' +
      p_merchant_id +
      '&' +
      'order_id=' +
      p_order_id +
      '&' +
      'currency=' +
      p_currency +
      '&' +
      'amount=' +
      p_amount +
      '&' +
      'redirect_url=' +
      p_redirect_url +
      '&' +
      'cancel_url=' +
      p_cancel_url +
      '&' +
      'language=' +
      p_language +
      '&' +
      'billing_name=' +
      p_billing_name +
      '&' +
      'billing_address=' +
      p_billing_address +
      '&' +
      'billing_city=' +
      p_billing_city +
      '&' +
      'billing_state=' +
      p_billing_state +
      '&' +
      'billing_zip=' +
      p_billing_zip +
      '&' +
      'billing_country=' +
      p_billing_country +
      '&' +
      'billing_tel=' +
      p_billing_tel +
      '&' +
      'billing_email=' +
      p_billing_email +
      '&' +
      'delivery_name=' +
      p_delivery_name +
      '&' +
      'delivery_address=' +
      p_delivery_address +
      '&' +
      'delivery_city=' +
      p_delivery_city +
      '&' +
      'delivery_state=' +
      p_delivery_state +
      '&' +
      'delivery_zip=' +
      p_delivery_zip +
      '&' +
      'delivery_country=' +
      p_delivery_country +
      '&' +
      'delivery_tel=' +
      p_delivery_tel +
      '&' +
      'merchant_param1=' +
      p_merchant_param1 +
      '&' +
      'merchant_param2=' +
      p_merchant_param2 +
      '&' +
      'merchant_param3=' +
      p_merchant_param3 +
      '&' +
      'merchant_param4=' +
      p_merchant_param4 +
      '&' +
      'merchant_param5=' +
      p_merchant_param5 +
      '&' +
      'promo_code=' +
      p_promo_code +
      '&' +
      'customer_identifier=' +
      p_customer_identifier +
      '&';

    const encrypted = this.encrypt(merchant_data, ccavenue_working_key);

    return {
      encRequest: encrypted,
      access_code: ccavenue_access_code,
    };
  }

  async createOrder(request: CollectRequest) {
    const p_merchant_id = request.ccavenue_merchant_id;
    const p_order_id = request._id.toString();
    const p_currency = 'INR';
    const p_amount = request.amount.toFixed(2);
    const p_redirect_url =
      process.env.URL +
      '/ccavenue/callback?collect_id=' +
      request._id.toString();
    const p_cancel_url =
      process.env.URL +
      '/ccavenue/callback?collect_id=' +
      request._id.toString();
    const p_language = 'EN';
    const p_billing_name = ''; // TODO: should be parent
    const p_billing_address = ''; // TODO
    const p_billing_city = '';
    const p_billing_state = '';
    const p_billing_zip = '';
    const p_billing_country = 'India';
    const p_billing_tel = '';
    const p_billing_email = '';
    const p_delivery_name = '';
    const p_delivery_address = '';
    const p_delivery_city = '';
    const p_delivery_state = '';
    const p_delivery_zip = '';
    const p_delivery_country = 'India';
    const p_delivery_tel = '';
    const p_merchant_param1 = '';
    const p_merchant_param2 = '';
    const p_merchant_param3 = '';
    const p_merchant_param4 = '';
    const p_merchant_param5 = '';
    const p_promo_code = '';
    const p_customer_identifier = '';
    
    

    const { encRequest, access_code } = this.ccavRequestHandler(
      p_merchant_id,
      p_order_id,
      p_currency,
      p_amount,
      p_redirect_url,
      p_cancel_url,
      p_language,
      p_billing_name,
      p_billing_address,
      p_billing_city,
      p_billing_state,
      p_billing_zip,
      p_billing_country,
      p_billing_tel,
      p_billing_email,
      p_delivery_name,
      p_delivery_address,
      p_delivery_city,
      p_delivery_state,
      p_delivery_zip,
      p_delivery_country,
      p_delivery_tel,
      p_merchant_param1,
      p_merchant_param2,
      p_merchant_param3,
      p_merchant_param4,
      p_merchant_param5,
      p_promo_code,
      p_customer_identifier,
      request.ccavenue_working_key,
      request.ccavenue_access_code,
    );

    const collectRequest=await this.databaseService.CollectRequestModel.findById(p_order_id)
    
    const info={
      url:
        process.env.URL +
        '/ccavenue/redirect?encRequest=' +
        encRequest +
        '&access_code=' +
        access_code,
    };

    if(collectRequest){
      collectRequest.payment_data=info.url
      await collectRequest.save()
    }

    // return {
    //   url:
    //     process.env.PG_FRONTEND +
    //     '/ccavenue?encRequest=' +
    //     encRequest +
    //     '&access_code=' +
    //     access_code,
    // };
    return {
      url:
        process.env.URL +
        '/ccavenue/redirect?encRequest=' +
        encRequest +
        '&access_code=' +
        access_code,
    };
  }

  async ccavResponseToCollectRequestId(
    encResp: string,
    ccavenue_working_key: string,
  ): Promise<String> {
    const decResp = this.decrypt(encResp, ccavenue_working_key);
    console.log(decResp);

    const queryString = decResp;
    const params = new URLSearchParams(queryString);
    const paramObject = Object.fromEntries(params.entries());
    return paramObject.order_id;
  }

  async checkStatus(
    collect_request: CollectRequest,
    collect_request_id: string,
  ): Promise<{
    status: TransactionStatus;
    amount: number;
    paymentInstrument?: string | null;
    paymentInstrumentBank?: string | null;
    decrypt_res?: any;
    transaction_time?: string;
    bank_ref?: string;
  }> {
    const { ccavenue_working_key, ccavenue_access_code } = collect_request;
    console.log(ccavenue_access_code,'ccavcode');
    console.log(collect_request_id);
    
    
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      );
    
      
      
      const encrypted_data: string = await this.encrypt(
      JSON.stringify({ order_no: collect_request_id }),
      ccavenue_working_key,
    );
    console.log(ccavenue_working_key,'collec');

    console.log(`checking status for ccavenue`);

    const collectReqStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectRequest?._id,
      });
    const data = qs.stringify({
      enc_request: encrypted_data,
      access_code: ccavenue_access_code,
      request_type: 'JSON',
      command: 'orderStatusTracker',
      order_no: collect_request_id,
    });
    console.log(ccavenue_access_code);

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.ccavenue.com/apis/servlet/DoWebTrans',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: data,
    };
    // await sleep(10000);
    try {
      const res = await axios.request(config);

      const params = new URLSearchParams(res.data);
      const paramObject = Object.fromEntries(params.entries());

      const decrypt_res = this.decrypt(
        paramObject['enc_response'],
        ccavenue_working_key,
      );

      const order_status_result = JSON.parse(decrypt_res).Order_Status_Result;

      const paymentInstrument = order_status_result['order_option_type'];
      const paymentInstrumentBank = order_status_result['order_card_name'];

      if (
        (order_status_result['order_status'] === 'Shipped' ||
          order_status_result['order_status'] === 'Successful') &&
        Math.floor((collectRequest!['amount'] as any) - 0) ===
          Math.floor(order_status_result['order_amt'])
      ) {
        return {
          status: TransactionStatus.SUCCESS,
          amount: order_status_result['order_amt'],
          paymentInstrument,
          paymentInstrumentBank,
          decrypt_res,
          transaction_time:
            collectReqStatus?.updatedAt?.toISOString() || 'null',
          bank_ref: order_status_result['order_bank_ref_no'],
        };
      } else if (
        order_status_result['order_status'] === 'Unsuccessful' ||
        order_status_result['order_status'] === 'Aborted' ||
        order_status_result['order_status'] === 'Invalid'
      ) {
        return {
          status: TransactionStatus.FAILURE,
          amount: order_status_result['order_amt'],
        };
      }
      return {
        status: TransactionStatus.PENDING,
        amount: order_status_result['order_amt'],
        decrypt_res,
      };
    } catch (err) {
      console.log(err);
      throw new UnprocessableEntityException(err.message);
    }
  }
}
