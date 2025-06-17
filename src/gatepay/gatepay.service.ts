import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
const crypto = require('crypto');

@Injectable()
export class GatepayService {
  constructor() {}

  async encryptEas(data: any, keyBase64: string, ivBase64: string) {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted.toUpperCase();
  }

  async createOrder(request: any) {
    const { _id, amount, gatepay } = request;
    try {
      const {
        gatepay_mid,
        gatepay_key,
        gatepay_iv,
        gatepay_terminal_id,
        udf1,
        udf2,
        udf3,
      } = gatepay;
      const formatDate = (date: Date) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const pad = (n: number) => n.toString().padStart(2, '0');
        const day = days[date.getDay()];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        // IST offset is +5:30
        return `${day} ${month} ${pad(
          date.getDate(),
        )} ${hours}:${minutes}:${seconds} IST ${year}`;
      };

      const formatedDate = formatDate(new Date())
      console.log(formatedDate, "formatedDate")

      const data = {
        mid: gatepay_mid,
        amount: amount.toFixed(2).toString(),
        merchantTransactionId: request._id.toString(),
        transactionDate: formatedDate,
        terminalId: gatepay_terminal_id,
        udf1: udf1,
        udf2: `mailto:${udf2}`,
        udf3: udf3,
        udf4: '',
        udf5: '',
        udf6: '',
        udf7: '',
        udf8: '',
        udf9: '',
        udf10: '',
        ru: `${process.env.URL}/gatepay/callback?collect_id=${_id}`,
        callbackUrl: `${process.env.URL}/gatepay/callback?collect_id=${_id}`,
        currency: 'INR',
        paymentMode: 'ALL',
        bankId: '',
        txnType: 'single',
        productType: 'IPG',
        txnNote: 'Test Txn',
        vpa: gatepay_terminal_id,
      };

      const ciphertext = await this.encryptEas(
        JSON.stringify(data),
        gatepay_key,
        gatepay_iv,
      );

      console.log(ciphertext, 'ciphertext');
      const raw = {
        mid: gatepay_mid,
        terminalId: gatepay_terminal_id,
        req: ciphertext,
      };
      const config = {
        url: 'https://pay1.getepay.in:8443/getepayPortal/pg/generateInvoice',
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: raw,
        redirect: 'follow',
      };

      const axiosRequest = axios.request(config);

      console.log(axiosRequest, 'request');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    return { url: 'url,', collect_req: request };
  }
}
