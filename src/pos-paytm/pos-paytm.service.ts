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

  async initiatePOSPayment(request: CollectRequest) {
    try {
      if (!request.paytmPos) {
        throw new BadRequestException('Error in Fetching POS Details');
      }
      const { paytmPos } = request;
      const body = {
        paytmMid: paytmPos.paytmMid,
        paytmTid: paytmPos.paytmTid,
        transactionDateTime: await this.fmt(await this.nowInIST()),
        merchantTransactionId: request._id.toString(),
        merchantReferenceNo: request._id.toString(),
        transactionAmount: String(Math.round(request.amount * 100)),
        callbackUrl: request.callbackUrl,
      };
      console.log(body);

      var checksum = await Paytm.generateSignature(
        body,
        paytmPos.paytm_merchant_key,
      );
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
      console.log('Paytm POS Payment Request Data:', requestData);
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
      return {
        requestSent: requestData,
        paytmResponse: response.data,
      };
    } catch (error) {
      console.error('Error initiating POS payment:', error);
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
        paytmMid: collectRequest.paytmPos.paytmMid,
        paytmTid: collectRequest.paytmPos.paytmTid,
        transactionDateTime: await this.fmt(await this.nowInIST()),
        merchantTransactionId: orderId,
      };
      console.log('debug 1', body);

      const checksum = await Paytm.generateSignature(
        body,
        collectRequest.paytmPos.paytm_merchant_key,
      );

      const requestData = {
        head: {
          requestTimeStamp: await this.fmt(await this.nowInIST()),
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

  async refund(collect_id: string, refund_amount: number, refund_id: string) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new BadRequestException('collect request not found');
      }
      const collectRequestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        });
      if (!collectRequestStatus) {
        throw new BadRequestException('collect request status not found');
      }
      if (refund_amount > collectRequest.amount) {
        throw new BadRequestException(
          'Refund amount cannot be greater than transaction amount',
        );
      }
      if (collectRequestStatus.status !== PaymentStatus.SUCCESS) {
        throw new BadRequestException(
          'Refund can only be processed for successful transactions',
        );
      }

      // check if transaction is success
      const body = {
        mid: collectRequest.paytmPos.paytmMid,
        txnType: 'REFUND',
        orderId: collectRequest._id.toString(),
        txnId: collect_id,
        refId: refund_id,
        refundAmount: refund_amount.toFixed(2),
      };
      const checksum = await Paytm.generateSignature(
        JSON.stringify(body),
        collectRequest.paytmPos.paytm_merchant_key,
      );
      const requestData = {
        head: {
          signature: checksum,
        },
        body: body,
      };
      const config = {
        url: `${process.env.PAYTM_POS_BASEURL}/refund/apply`,
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

  async formattedStatu(collect_id: string) {
    const { body } = await this.getTransactionStatus(collect_id);
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new BadRequestException('Error in Fetching Request');
    }
    let statusCode = '400';
    if (body.resultInfo.resultStatus === 'SUCCESS') {
      statusCode = '200';
    }
    let payment_method = '';
    let details: any = {};
    let platform_type = '';
    let payment_mode = 'Others';
    switch (body.payMethod) {
      case 'CREDIT_CARD':
        payment_method = 'credit_card';
        payment_mode = body.cardScheme.toLocaleLowerCase();
        platform_type = body.cardScheme.toLocaleLowerCase();
        details = {
          card: {
            card_bank_name: body.issuingBankName,
            card_country: 'IN',
            card_network: body.cardScheme.toLocaleLowerCase(),
            card_number: body.issuerMaskCardNo,
            card_sub_type: '',
            card_type: 'credit_card',
            channel: null,
          },
        };
        break;

      case 'DEBIT_CARD':
        payment_method = 'debit_card';
        payment_mode = body.cardScheme.toLocaleLowerCase();
        platform_type = body.cardScheme.toLocaleLowerCase();
        details = {
          card: {
            card_bank_name: body.issuingBankName,
            card_country: 'IN',
            card_network: body.cardScheme.toLocaleLowerCase(),
            card_number: body.issuerMaskCardNo,
            card_sub_type: '',
            card_type: 'debit_card',
            channel: null,
          },
        };
        break;
      case 'UPI':
        payment_method = 'upi';
        payment_mode = 'Others';
        platform_type = 'Others';
        details = {
          upi: {
            upi_id: 'NA',
          },
        };
        break;
    }
    const response = {
      status: body.resultInfo.resultStatus,
      amount: request.amount,
      transaction_amount: Number(body.transactionAmount / 100),
      status_code: statusCode,
      details: details,
      custom_order_id: request.custom_order_id || null,
      //   capture_status: 'PENDING',
      //   jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGF0dXMiOiJTVUNDRVNTIiwiYW1vdW50Ijo1MDAsInRyYW5zYWN0aW9uX2Ftb3VudCI6NTA1LjksInN0YXR1c19jb2RlIjoyMDAsImRldGFpbHMiOnsiYmFua19yZWYiOiI1MzcwNFhYWFhYIiwicGF5bWVudF9tZXRob2RzIjp7InVwaSI6eyJjaGFubmVsIjpudWxsLCJ1cGlfaWQiOiJlZHZpcm9uQG9rYXhpcyJ9fSwidHJhbnNhY3Rpb25fdGltZSI6IjIwMjUtMDEtMDRUMTg6MTY6NDAuNDIxWiIsImZvcm1hdHRlZFRyYW5zYWN0aW9uRGF0ZSI6IjIwMjUtMDEtMDQiLCJvcmRlcl9zdGF0dXMiOiJQQUlEIiwiaXNTZXR0bGVtZW50Q29tcGxldGUiOnRydWUsInRyYW5zZmVyX3V0ciI6IkFYSVNDTjBYWFhYWCIsInNlcnZpY2VfY2hhcmdlIjo1Ljg5OTk5OTk5OTk5OTk3N30sImN1c3RvbV9vcmRlcl9pZCI6IlBMODA2NTcyNVhYWFhYWCIsImNhcHR1cmVfc3RhdHVzIjoiUEVORElORyJ9.9A_PNdOM03_OR8_LFSHRGS95Rx4gPGufhh3FNC8JJ4Q',
    };
    return response;
  }
}
