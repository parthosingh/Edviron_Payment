import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
const crypto = require('crypto');

@Injectable()
export class GatepayService {
  constructor(private readonly databaseService: DatabaseService) {}

  async encryptEas(data: any, keyBase64: string, ivBase64: string) {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted.toUpperCase();
  }

  async decryptEas(encryptedData: string, keyBase64: string, ivBase64: string) {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async createOrder(request: CollectRequest) {
    const { _id, amount, gatepay, additional_data } = request;
    let student_details: any = {};
    try {
      student_details =
        typeof additional_data === 'string'
          ? JSON.parse(additional_data)
          : additional_data;
    } catch (err) {
      console.error('Error parsing additional_data:', err.message);
    }
    try {
      const { gatepay_mid, gatepay_key, gatepay_iv, gatepay_terminal_id } =
        gatepay;
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
      const formatedDate = formatDate(new Date());
      const data = {
        mid: gatepay_mid,
        amount: amount.toFixed(2).toString(),
        merchantTransactionId: request._id.toString(),
        transactionDate: formatedDate,
        terminalId: gatepay_terminal_id,
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
      const raw = {
        mid: gatepay_mid,
        terminalId: gatepay_terminal_id,
        req: ciphertext,
      };
      const config = {
        url: `${process.env.GET_E_PAY_URL}/getepayPortal/pg/generateInvoice`,
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        data: raw,
        redirect: `${process.env.URL}/gatepay/callback?collect_id=${_id}`,
      };
      const response = await axios.request(config);
      if (response.data.status !== 'SUCCESS') {
        throw new BadRequestException('payment link not created');
      }

      const decrypted = await this.decryptEas(
        response.data.response,
        gatepay_key,
        gatepay_iv,
      );
      console.log(decrypted, 'decrypted');
      const parsedData = JSON.parse(decrypted);
      const { paymentUrl, qrPath, qrIntent, paymentId, token } = parsedData;

      await this.databaseService.CollectRequestModel.findByIdAndUpdate(
        {
          _id,
        },
        {
          $set: {
            'gatepay.token': token,
            'gatepay.txnId': paymentId,
            'gatepay.paymentUrl':paymentUrl
          },
        },
        {
          upsert: true,
          new: true,
        },
      );
      const url = `${process.env.URL}/gatepay/redirect?&collect_id=${request._id}`
      return { url: url, collect_req: request };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

    async getPaymentStatus(collect_id: string, collect_req: any) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      // console.log(collectRequest)
      if (!collectRequest) {
        throw new BadRequestException('Collect request not found');
      }
      const { gatepay } = collectRequest;
      const {
        gatepay_mid,
        gatepay_key,
        gatepay_iv,
        gatepay_terminal_id,
        txnId,
      } = gatepay;

      const data = {
        mid: gatepay,
        paymentId: txnId,
        referenceNo: '',
        status: '',
        terminalId: gatepay_terminal_id
      };

      const ciphertext = await this.encryptEas(
        JSON.stringify(data),
        gatepay_key,
        gatepay_iv,
      );
      const raw = {
        mid: gatepay_mid,
        terminalId: gatepay_terminal_id,
        req: ciphertext,
      };
      const config = {
        url: `${process.env.GET_E_PAY_URL}/getepayPortal/pg/invoiceStatus`,
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        data: raw,
      };
      const response = await axios.request(config);
      console.log(response.data)
      return response.data
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

}
