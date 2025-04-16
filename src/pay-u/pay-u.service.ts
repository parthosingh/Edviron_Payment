import { BadRequestException, Injectable } from '@nestjs/common';
import { calculateSHA512Hash } from 'src/utils/sign';
import * as qs from 'qs';
import axios from 'axios';
const { unserialize } = require('php-unserialize');
import { DatabaseService } from 'src/database/database.service';
@Injectable()
export class PayUService {
  constructor(private readonly databaseService: DatabaseService) {}
  async generate512HASH(
    key: string,
    txnid: string,
    amount: number,
    salt: string,
  ) {
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    const hashString = `${key}|${txnid}|${amount}|school_fee|edviron|noreply@edviron.com|||||||||||${salt}`;
    console.log(hashString);
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
}
