import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { DatabaseService } from '../database/database.service';
import { GatepayService } from './gatepay.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';

@Controller('gatepay')
export class GatepayController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly gatepayService: GatepayService,
  ) {}

  @Get('/redirect')
  async redirect(@Query('collect_id') collect_id: string, @Res() res: any) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) throw new BadRequestException('Order Id not found');
      const paymentUrl = collectRequest.gatepay.paymentUrl;
      if (!paymentUrl) {
        throw new BadRequestException('payment url not found');
      }
      res.redirect(paymentUrl);
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  @Post('callback')
  async handleCallback(@Req() req: any, @Res() res: any) {
    try {
      const { collect_id } = req.query;
      const {  message, response, terminalId } = req.body;

      const [collect_request, collect_req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);

      if (!collect_request || !collect_req_status) {
        throw new BadRequestException('Request not found');
      }
      const { gatepay_key, gatepay_iv } = collect_request.gatepay;

      const decrypted = await this.gatepayService.decryptEas(
        response,
        gatepay_key,
        gatepay_iv,
      );

      const parseData = JSON.parse(JSON.parse(decrypted));

      const { paymentMode, txnAmount, txnDate, getepayTxnId } = parseData;
// console.log(parseData)
      const { status } = await this.gatepayService.getPaymentStatus(
        collect_id,
        collect_request,
      );
      try {
        await this.databaseService.WebhooksModel.create({
          body: JSON.stringify(parseData),
          encData: JSON.stringify(req.body),
          gateway: 'gatepay_callback',
        });
      } catch (error) {
        console.error('Webhook save failed:', error.message);
      }

      let paymentMethod = '';
      let details: any;
      switch (paymentMode) {
        case 'DC':
          paymentMethod = 'debit_card';
          details = {
            card: {
              card_bank_name: 'N/A',
              card_country: 'N/A',
              card_network: 'N/A',
              card_number: 'N/A',
              card_sub_type: 'N/A',
              card_type: 'N/A',
              channel: null,
            },
          };
          break;
        case 'CC':
          paymentMethod = 'credit_card';
          details = {
            card: {
              card_bank_name: 'N/A',
              card_country: 'N/A',
              card_network: 'N/A',
              card_number: 'N/A',
              card_sub_type: 'N/A',
              card_type: 'N/A',
              channel: null,
            },
          };
          break;
        case 'NB':
          paymentMethod = 'net_banking';
          details = {
            netbanking: {
              channel: null,
              netbanking_bank_code: 'N/A',
              netbanking_bank_name: 'N/A',
            },
          };
          break;
        case 'UPI':
          paymentMethod = 'upi';
          details = {
            upi: {
              channel: 'N/A',
              upi_id: 'N/A',
            },
          };
          break;
        case 'UPIQR':
          paymentMethod = 'upi';
          details = {
            upi: {
              channel: 'N/A',
              upi_id: 'N/A',
            },
          };
          break;
        default:
          paymentMethod = '';
          details = {};
          break;
      }
      const formattedDate = txnDate?.replace(' ', 'T');
      const dateObj = formattedDate ? new Date(formattedDate) : null;

      if (!dateObj || isNaN(dateObj.getTime())) {
        throw new BadRequestException('Invalid txnDate received');
      }

      collect_req_status.status =
        status === 'SUCCESS'
          ? PaymentStatus.SUCCESS
          : status === 'FAILED'
          ? PaymentStatus.FAILED
          : PaymentStatus.PENDING;

      collect_req_status.transaction_amount = txnAmount || '';
      collect_req_status.payment_time = dateObj || Date.now();
      collect_req_status.payment_method = paymentMethod || '';
      collect_req_status.payment_message = message || '';
      collect_req_status.reason = message || '';
      collect_req_status.details = JSON.stringify(details) || '';
      await collect_req_status.save();

      const payment_status = collect_req_status.status;
      if (collect_request.sdkPayment) {
        const redirectBase = process.env.PG_FRONTEND;
        const route =
          payment_status === PaymentStatus.SUCCESS
            ? 'payment-success'
            : 'payment-failure';
        return res.redirect(
          `${redirectBase}/${route}?collect_id=${collect_id}`,
        );
      }

      const callbackUrl = new URL(collect_request.callbackUrl);
      callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);

      if (payment_status !== PaymentStatus.SUCCESS) {
        callbackUrl.searchParams.set('status', 'FAILED');
        callbackUrl.searchParams.set('reason', 'Payment-failed');
        return res.redirect(callbackUrl.toString());
      }

      callbackUrl.searchParams.set('status', 'SUCCESS');
      return res.redirect(callbackUrl.toString());
    } catch (error) {
      console.error('Callback Error:', error);
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }
}
