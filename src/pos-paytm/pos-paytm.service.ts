import { BadRequestException, Injectable, Res } from '@nestjs/common';
import {
    CollectRequest,
  CollectRequestDocument,
  Gateway,
} from 'src/database/schemas/collect_request.schema';
// import * as PaytmChecksum from 'paytmchecksum';
const Paytm = require('paytmchecksum');
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import { Types } from 'mongoose';
import { data } from 'autoprefixer';
import { platformChange } from 'src/collect/collect.controller';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';

@Injectable()
export class PosPaytmService {
  constructor(private readonly databaseService: DatabaseService) {}

  async nowInIST(): Promise<Date> {
    return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  }

  async fmt(d: Date): Promise<string> {
    return d.toISOString().replace(/T/, ' ').replace(/\..+/, '');
  }
  // async initiatePOSPayment(collectRequest: CollectRequestDocument) {
  async initiatePOSPayment(
    request:CollectRequest
  ) {
    try {
        if(!request.paytmPos){
            throw new BadRequestException('Error in Fetching POS Details')
        }

        const {paytmPos}=request
      const body = {
        paytmMid: paytmPos.paytmMid,
        paytmTid: paytmPos.paytmTid,
        transactionDateTime: await this.fmt(await this.nowInIST()),
        merchantTransactionId: request._id.toString(),
        merchantReferenceNo: request._id.toString(),
        transactionAmount: String(Math.round(request.amount * 100)),
        callbackUrl: request.callbackUrl,
      };

      var checksum = await Paytm.generateSignature(body, paytmPos.paytm_merchant_key);
      var isVerifySignature = await Paytm.verifySignature(
        body,
        paytmPos.paytm_merchant_key,
        checksum,
      );
      if (!isVerifySignature) {
        throw new BadRequestException('Checksum verification failed');
      }
      const requestData = {
        head: {
          requestTimeStamp: await this.fmt(await this.nowInIST()),
          channelId: paytmPos.channel_id,
          checksum: checksum,
        },
        body: body,
      };

      const config = {
        url: `${process.env.PAYTM_POS_BASEURL}/ecr/payment/request`,
        // url: `https://securegw-stage.paytm.in/eos/`,
        method: 'post',
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify(requestData),
      };

      const response = await axios.request(config);

      // console.log('Paytm POS Payment Request:', response);
      console.log('Paytm POS Payment Response:', response.data);

      return {
        requestSent: requestData,
        paytmResponse: response.data,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(error.message);
    }
  }

  async collectPayment(
    amount: Number,
    callbackUrl: string,
    school_id: string,
    trustee_id: string,
    paytm_pos: {
      paytmMid: string;
      paytmTid: string;
      channel_id: string;
      paytm_merchant_key: string;
      device_id: string; //edviron
    },
    platform_charges: platformChange[],
    additional_data?: {},
    custom_order_id?: string,
    req_webhook_urls?: string[],
    school_name?: string,
  ) {
    try {
      // Creating collect request
      const request = await this.databaseService.CollectRequestModel.create({
        amount,
        callbackUrl,
        gateway: Gateway.PAYTM_POS,
        req_webhook_urls,
        school_id,
        trustee_id,
        additional_data: JSON.stringify(additional_data),
        custom_order_id: custom_order_id || null,
        paytmPos: paytm_pos,
        isPosTransaction: true,
      });

      await new this.databaseService.CollectRequestStatusModel({
        collect_id: request._id,
        status: PaymentStatus.PENDING,
        order_amount: request.amount,
        transaction_amount: request.amount,
        payment_method: null,
      }).save();

      return await this.initiatePOSPayment(request);
    } catch (error) {
      console.error(error);
      throw new BadRequestException({
        message: 'Payment request error',
        error: error.message,
      });
    }
  }

  async getTransactionStatus(orderId: string) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(orderId);
      if (!collectRequest) {
        throw new BadRequestException('collect request not found');
      }
      const collectRequestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(orderId),
        });
      if (!collectRequestStatus) {
        throw new BadRequestException('collect request status not found');
      }
      const body = {
        paytmMid: collectRequest.pos_machine_device_id,
        paytmTid: collectRequest.pos_machine_device_code,
        transactionDateTime: collectRequestStatus.payment_time
          .toISOString()
          .slice(0, 19)
          .replace('T', ' '),
        merchantTransactionId: orderId,
      };
      const checksum = await Paytm.generateSignature(
        JSON.stringify(body),
        process.env.PAYTM_MERCHANT_KEY || 'n/a',
      );
      const requestData = {
        head: {
          requestTimeStamp: collectRequestStatus.payment_time
            .toISOString()
            .slice(0, 19)
            .replace('T', ' '),
          channelId: 'RIL',
          checksum: checksum,
          version: '3.1',
        },
        body: body,
      };

      const config = {
        url: `${process.env.PAYTM_POS_BASEURL}/ecr/V2/payment/status`,
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(requestData),
      };
      const response = await axios.request(config);

      return response.data;
    } catch (error) {
      console.error('Error fetching transaction status:', error);
      throw new BadRequestException('Failed to fetch transaction status.');
    }
  }
}
