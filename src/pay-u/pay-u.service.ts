import { BadRequestException, Injectable } from '@nestjs/common';
import { calculateSHA512Hash } from 'src/utils/sign';
import * as qs from 'qs';
import axios from 'axios';
const { unserialize } = require('php-unserialize');
import { DatabaseService } from 'src/database/database.service';
import { Types } from 'mongoose';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';

@Injectable()
export class PayUService {
  constructor(private readonly databaseService: DatabaseService) {}
  async generate512HASH(
    key: string,
    txnid: string,
    amount: number,
    salt: string,
    firstName:string
  ) {
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    const hashString = `${key}|${txnid}|${amount}|school_fee|${firstName}|noreply@edviron.com|||||||||||${salt}`;
    // console.log(hashString);
    // BuxMPz|67ece371867428170c271728|1|school_fee|edviron|noreply@edviron.com|||||||||||ePBfYcIbiJPsAyduYb3rPre11uRvaI7a

    const hash = await calculateSHA512Hash(hashString);
    return hash;
  }

  async checkStatus(collect_id: string) {
    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new BadRequestException('Order not found');
      }

      const url = 'https://info.payu.in/merchant/postservice.php?form=2';
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Cookie: 'PHPSESSID=gdtsmpkbmilsv9beouqc1t10u4',
      };
      const hashString = `${request.pay_u_key}|verify_payment|${collect_id}|${request.pay_u_salt}`;
      const hash = await calculateSHA512Hash(hashString);
      console.log('debug');

      const data = qs.stringify({
        key: request.pay_u_key,
        command: 'verify_payment',
        var1: collect_id,
        hash,
      });

      const response = await axios.post(url, data, { headers });
      console.log(response.data);

      const jsonData = response.data;
      const { transaction_details } = jsonData;
      const transactionKey = collect_id;
      const transactionData = transaction_details[transactionKey];

      const {
        mode,
        status,
        net_amount_debit,
        transaction_amount,
        bank_ref_num,
        amt,
        addedon,
      } = transactionData;
      let status_code = 400;
      if (status.toUpperCase() === 'SUCCESS') {
        status_code = 200;
      }
      //   return transactionData
      return {
        status: status.toUpperCase(),
        amount: Number(amt),
        transaction_amount: Number(transaction_amount),
        status_code,
        details: {
          payment_mode: mode.toLowerCase(),
          bank_ref: bank_ref_num,
          payment_methods: {},
          transaction_time: addedon,
        },
        mode,
        net_amount_debit,
        bank_ref_num,
      };
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  async terminateOrder(collect_id: string) {
    try {
      const [request, req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);
      if (!request || !req_status) {
        throw new BadRequestException('Order not found');
      }
      if (req_status.status === PaymentStatus.PENDING) {
        req_status.status = PaymentStatus.USER_DROPPED;
        req_status.payment_message = 'Session Expired';
        await req_status.save();
        return true;
      }
      return req_status.status !== PaymentStatus.SUCCESS;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to terminate order',
      );
    }
  }
}

const dummy = {
  mihpayid: '23192519459',
  mode: 'CC',
  status: 'success',
  key: 'CQn2g6',
  txnid: '67ffe8bc9138e26559ac7f25',
  amount: '1.00',
  addedon: '2025-04-16 22:58:30',
  productinfo: 'school_fee',
  firstname: 'edviron',
  lastname: 'edviron',
  address1: '',
  address2: '',
  city: '',
  state: '',
  country: '',
  zipcode: '',
  email: 'noreply@edviron.com',
  phone: '0000000000',
  udf1: '',
  udf2: '',
  udf3: '',
  udf4: '',
  udf5: '',
  udf6: '',
  udf7: '',
  udf8: '',
  udf9: '',
  udf10: '',
  card_token: '',
  card_no: 'XXXXXXXXXXXX3004',
  field0: '',
  field1: '04162025 225922',
  field2: '250436',
  field3: '',
  field4: '2',
  field5: '',
  field6: '05',
  field7: 'AUTHPOSITIVE',
  field8:
    '00 | Successful approval/completion or that V.I.P. PIN verification is valid',
  field9: 'No Error',
  payment_source: 'payu',
  PG_TYPE: 'CC-PG',
  error: 'E000',
  error_Message: 'No Error',
  cardToken: '',
  net_amount_debit: '1',
  discount: '0.00',
  offer_key: '',
  offer_availed: '',
  unmappedstatus: 'captured',
  hash: '1b35b83a58358adc75ad7936be097a20bd8bf819c20874dba84eea46c05ee6696a563ce36d8b0d0fde47cb329e0a88c38f739b28bef7c180ad03fd763c0cafe9',
  bank_ref_no: '510622802038',
  bank_ref_num: '510622802038',
  bankcode: 'CC',
  surl: 'https://payments.edviron.com/pay-u/callback/?collect_id=67ffe8bc9138e26559ac7f25',
  curl: 'https://payments.edviron.com/pay-u/callback/?collect_id=67ffe8bc9138e26559ac7f25',
  furl: 'https://payments.edviron.com/pay-u/callback/?collect_id=67ffe8bc9138e26559ac7f25',
  card_hash: 'd48a73d6cfcdb6093bd02f3a40c4b33fa488512ea401f9f57bd4eeb0877e6d16',
};
