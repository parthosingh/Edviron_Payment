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
export class HdfcService implements GatewayService {
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
    const encrypted = this.encrypt(
      merchant_data,
      process.env.CCAVENUE_WORKINGKEY!,
    );
    return {
      encRequest: encrypted,
      access_code: process.env.CCAVENUE_ACCESSCODE,
    };
  }
  async collect(request: CollectRequest): Promise<Transaction> {
    const p_merchant_id = process.env.CCAVENUE_MERCHANTID!;
    const p_order_id = request._id.toString();
    const p_currency = 'INR';
    const p_amount = request.amount.toFixed(2);
    const p_redirect_url = process.env.URL + '/hdfc/callback';
    const p_cancel_url = process.env.URL + '/hdfc/callback';
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
    );
    return {
      url:
        process.env.URL +
        '/hdfc/redirect?encRequest=' +
        encRequest +
        '&access_code=' +
        access_code,
    };
  }
  async ccavResponseToCollectRequestId(encResp: string): Promise<String> {
    const decResp = this.decrypt(encResp, process.env.CCAVENUE_WORKINGKEY!);
    const queryString = decResp;
    const params = new URLSearchParams(queryString);
    const paramObject = Object.fromEntries(params.entries());
    return paramObject.order_id;
  }

  async checkStatus(collectRequestId: String): Promise<{
    status: TransactionStatus;
    amount: number;
    paymentInstrument?: string | null;
    paymentInstrumentBank?: string | null;
  }> {
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collectRequestId);
    const encrypted_data: string = await this.encrypt(
      JSON.stringify({ order_no: collectRequestId }),
      process.env.CCAVENUE_WORKINGKEY!,
    );
    const data = qs.stringify({
      enc_request: encrypted_data,
      access_code: process.env.CCAVENUE_ACCESSCODE,
      request_type: 'JSON',
      command: 'orderStatusTracker',
      order_no: collectRequestId,
    });
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.ccavenue.com/apis/servlet/DoWebTrans',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: data,
    };
    await sleep(10000);
    try {
      const res = await axios.request(config);
      const params = new URLSearchParams(res.data);
      const paramObject = Object.fromEntries(params.entries());
      const decrypt_res = this.decrypt(
        paramObject['enc_response'],
        process.env.CCAVENUE_WORKINGKEY!,
      );
      const order_status_result = JSON.parse(decrypt_res).Order_Status_Result;
      console.log({ order_status_result });

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
      };
    } catch (err) {
      // console.log(err);
      throw new UnprocessableEntityException(err.message);
    }
  }
}
