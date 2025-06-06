import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { PosPaytmService } from './pos-paytm.service';
import { platformChange } from 'src/collect/collect.controller';
import * as _jwt from 'jsonwebtoken';
import { DatabaseService } from 'src/database/database.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import * as jwt from 'jsonwebtoken';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import axios from 'axios';
const Paytm = require('paytmchecksum');
@Controller('pos-paytm')
export class PosPaytmController {
  constructor(
    private readonly posPaytmService: PosPaytmService,
    private readonly databaseService: DatabaseService,
       private readonly edvironPgService: EdvironPgService,
  ) {}
  @Post('/initiate-payment')
  async initiatePayment(
    @Body()
    body: {
      amount: Number;
      callbackUrl: string;
      jwt: string;
      school_id: string;
      trustee_id: string;
      paytm_pos: {
        paytmMid: string;
        paytmTid: string;
        channel_id: string;
        paytm_merchant_key: string;
        device_id: string; //edviron
      };
      platform_charges: platformChange[];
      additional_data?: {};
      custom_order_id?: string;
      req_webhook_urls?: string[];
      school_name?: string;
    },
  ) {
    const {
      amount,
      callbackUrl,
      jwt,
      school_id,
      trustee_id,
      paytm_pos,
      platform_charges,
      additional_data,
      custom_order_id,
      req_webhook_urls,
      school_name,
    } = body;
    if (!jwt) throw new BadRequestException('JWT not provided');
    if (!amount) throw new BadRequestException('Amount not provided');
    try {
      const decrypt = _jwt.verify(jwt, process.env.KEY!) as any;
      if (decrypt.school_id !== school_id) {
        throw new BadRequestException(`Request Fordge`);
      }
      return await this.posPaytmService.collectPayment(
        amount,
        callbackUrl,
        school_id,
        trustee_id,
        paytm_pos,
        platform_charges,
        additional_data,
        custom_order_id,
        req_webhook_urls,
        school_name,
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('callback')
  async PosCallback(@Body() body: any, @Res() res: any) {
    try {
      // await this.databaseService.WebhooksModel.create({
      //   gateway: 'POS_PAYTM',
      //   body: JSON.stringify(body),
      // });
      const { head, body: bodyData } = body;
      const {
        paytmMid,
        paytmTid,
        transactionDateTime,
        merchantTransactionId,
        merchantReferenceNo,
        transactionAmount,
        acquirementId,
        retrievalReferenceNo,
        authCode,
        issuerMaskCardNo,
        issuingBankName,
        bankResponseCode,
        bankResponseMessage,
        bankMid,
        bankTid,
        merchantExtendedInfo,
        extendedInfo,
        acquiringBank,
        resultInfo,
      } = bodyData;
      const checksum = head.checksum;
      const request = await this.databaseService.CollectRequestModel.findById(
        merchantTransactionId,
      );
      if (!request) {
        throw new BadRequestException('Invalid merchantTransactionId ');
      }
      const requestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: request._id,
        });
      if (!requestStatus) {
        throw new BadRequestException('Invalid transaction id ');
      }
      if (requestStatus && requestStatus.status === 'SUCCESS') {
        res.status(200).send('OK');
        return;
      }
      const { paytmPos } = request;
      let flatParams: any = {};
      Object.keys(bodyData).forEach((key) => {
        if (typeof bodyData[key] !== 'object') {
          flatParams[key] = String(bodyData[key]);
        }
      });
      const isVerifySignature = await Paytm.verifySignature(
        flatParams,
        paytmPos.paytm_merchant_key,
        checksum,
      );
      if (!isVerifySignature) {
        throw new BadRequestException(`Error in Verifying Checksum`);
      }
      const { body: paymentStatus } =
        await this.posPaytmService.getTransactionStatus(merchantTransactionId);
      let payment_method = '';
      let details: any = {};
      let platform_type = '';
      let payment_mode = 'Others';
      const { resultStatus, resultCode, resultMsg, resultCodeId } =
        paymentStatus.resultInfo;

      switch (paymentStatus.payMethod) {
        case 'CREDIT_CARD':
          payment_method = 'credit_card';
          payment_mode = paymentStatus.cardScheme.toLocaleLowerCase();
          platform_type = paymentStatus.cardScheme.toLocaleLowerCase();
          details = {
            card: {
              card_bank_name: paymentStatus.issuingBankName,
              card_country: 'IN',
              card_network: paymentStatus.cardScheme.toLocaleLowerCase(),
              card_number: paymentStatus.issuerMaskCardNo,
              card_sub_type: '',
              card_type: 'credit_card',
              channel: null,
            },
          };
          break;

        case 'DEBIT_CARD':
          payment_method = 'debit_card';
          payment_mode = paymentStatus.cardScheme.toLocaleLowerCase();
          platform_type = paymentStatus.cardScheme.toLocaleLowerCase();
          details = {
            card: {
              card_bank_name: paymentStatus.issuingBankName,
              card_country: 'IN',
              card_network: paymentStatus.cardScheme.toLocaleLowerCase(),
              card_number: paymentStatus.issuerMaskCardNo,
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

      if (resultStatus === 'SUCCESS') {
        try {
          const tokenData = {
            school_id: request?.school_id,
            trustee_id: request?.trustee_id,
            order_amount: requestStatus?.order_amount,
            transaction_amount: paymentStatus.transactionAmount / 100,
            platform_type,
            payment_mode,
            collect_id: request?._id,
          };

          const _jwt = jwt.sign(tokenData, process.env.KEY!, {
            noTimestamp: true,
          });

          let data = JSON.stringify({
            token: _jwt,
            school_id: request?.school_id,
            trustee_id: request?.trustee_id,
            order_amount: requestStatus?.order_amount,
            transaction_amount: paymentStatus.transactionAmount,
            platform_type,
            payment_mode,
            collect_id: request?._id,
          });
          let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/add-commission`,
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'x-api-version': '2023-08-01',
            },
            data: data,
          };
          try {
            const { data: commissionRes } = await axios.request(config);
            console.log(commissionRes, 'Commission saved');
          } catch (e) {
            console.log(`failed to save commision ${e.message}`);
          }
        } catch (e) {}
      }
      const updateReq =
        await this.databaseService.CollectRequestStatusModel.updateOne(
          {
            collect_id: request._id,
          },
          {
            $set: {
              status: resultStatus,
              transaction_amount: transactionAmount,
              payment_method,
              details: JSON.stringify(details),
              bank_reference: retrievalReferenceNo,
              payment_time: new Date(transactionDateTime),
            },
          },
          {
            upsert: true,
            new: true,
          },
        );
      const webHookUrl = request.req_webhook_urls;
      // ERP WEBHOOK
      if (webHookUrl && webHookUrl.length > 0) {
        try {
            const transactionTime = requestStatus.payment_time;
          const amount = request?.amount;
          const custom_order_id = request?.custom_order_id || '';
          const additional_data = request?.additional_data || '';
          const webHookDataInfo = {
            collect_id:request._id,
            amount,
            status:resultStatus,
            trustee_id: request.trustee_id,
            school_id: request.school_id,
            req_webhook_urls: request?.req_webhook_urls,
            custom_order_id,
            createdAt: requestStatus?.createdAt,
            transaction_time: transactionDateTime,
            additional_data,
            details: requestStatus.details,
            transaction_amount: requestStatus.transaction_amount,
            bank_reference: requestStatus.bank_reference,
            payment_method: requestStatus.payment_method,
            payment_details: requestStatus.details,
            formattedDate: `${transactionTime.getFullYear()}-${String(
              transactionTime.getMonth() + 1,
            ).padStart(2, '0')}-${String(transactionTime.getDate()).padStart(
              2,
              '0',
            )}`,
          };

          if (webHookUrl !== null) {
            console.log('calling webhook');
            if (
              request?.trustee_id.toString() ===
              '66505181ca3e97e19f142075'
            ) {
              console.log('Webhook called for webschool');
              setTimeout(async () => {
                await this.edvironPgService.sendErpWebhook(
                  webHookUrl,
                  webHookDataInfo,
                );
              }, 60000);
            } else {
              console.log('Webhook called for other schools');

              await this.edvironPgService.sendErpWebhook(
                webHookUrl,
                webHookDataInfo,
              );
            }
          }
        } catch (e) {}
      }
      res.status(200).send('OK');
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);

      // await this.databaseService.WebhooksModel.create({
      //   gateway: 'POS_PAYTM',
      //   body: 'Error in callback saving',
      // });
    }

    return true;
  }

  @Get('status')
  async checkStatus(@Query('collect_id') collect_id: string) {
    return await this.posPaytmService.getTransactionStatus(collect_id);
  }
}
