import {
  Body,
  Controller,
  Post,
  Param,
  Res,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { HdfcRazorpayService } from './hdfc_razorpay.service';
import { DatabaseService } from 'src/database/database.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { Types } from 'mongoose';
import { log } from 'console';

@Controller('hdfc-razorpay')
export class HdfcRazorpayController {
  constructor(
    private readonly hdfcRazorpayService: HdfcRazorpayService,
    private readonly databaseService: DatabaseService,
  ) { }

  @Post('/callback/:collect_id')
  async handleCallback(
    @Body()
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    @Param('collect_id') collect_id: string,
    @Res() res: any,
  ) {
    try {
      const {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      } = body;
      console.log(body);
      
      console.log(collect_id);
      
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) throw new BadRequestException('Order Id not found');

      const isValid = this.hdfcRazorpayService.verifySignature(
        orderId,
        paymentId,
        signature,
        collectRequest.hdfc_razorpay_secret,
      );
      if (!isValid) throw new BadRequestException('Invalid Signature');

      collectRequest.gateway = Gateway.EDVIRON_HDFC_RAZORPAY;
      collectRequest.hdfc_razorpay_order_id = orderId;
      collectRequest.hdfc_razorpay_payment_id = paymentId;
      await collectRequest.save();

      const paymentStatus = await this.hdfcRazorpayService.checkPaymentStatus(
        paymentId,
        collectRequest,
      );

      if (collectRequest.sdkPayment) {
        if (paymentStatus.status === 'SUCCESS') {
          return res.redirect(
            `${process.env.PG_FRONTEND}/payment-success?collect_id=${collectRequest._id}`,
          );
        }
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collectRequest._id}`,
        );
      }

      const callbackUrl = new URL(collectRequest?.callbackUrl);
      if (paymentStatus.status !== `SUCCESS`) {
        callbackUrl.searchParams.set(
          'EdvironCollectRequestId',
          collectRequest._id.toString(),
        );
        callbackUrl.searchParams.set('status', paymentStatus.status);

        return res.redirect(callbackUrl.toString());
      }
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collectRequest._id.toString(),
      );
      callbackUrl.searchParams.set('status', paymentStatus.status);
      return res.redirect(callbackUrl.toString());
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  @Get('/redirect')
  async handleRedirectPaymentPage(
    @Query('collect_id') collect_id: string,
    @Query('order_id') order_id: string,
    @Query('school_name') school_name: string,
    @Res() res: any,
  ) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) throw new BadRequestException('Order Id not found');

      const amount = (collectRequest.amount * 100).toString();
      const callback_url = new URL(
        `${collectRequest.callbackUrl}?collect_id=${collect_id}`,
      ).toString();

      const formatted_school_name = school_name.split('_').join(' ');

      res.send(
        `
    <form method="POST" name="redirect" action="https://api.razorpay.com/v1/checkout/embedded">
      <input type="hidden" name="key_id" value="${collectRequest.hdfc_razorpay_id}" />
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="currency" value="INR" />
      <input type="hidden" name="order_id" value="${order_id}" />
      <input type="hidden" name="name" value="${formatted_school_name}" />
      <input type="hidden" name="prefill[contact]" value="9090909090" />
      <input
        type="hidden"
        name="prefill[email]"
        value="testing@email.com"
      />
      <input
        type="hidden"
        name="image"
        value="https://cdn.razorpay.com/logos/BUVwvgaqVByGp2_large.jpg"
      />
      <input
        type="hidden"
        name="callback_url"
        value="${process.env.URL}/hdfc-razorpay/callback/${collect_id}"
      />
      <input
        type="hidden"
        name="cancel_url"
        value="${callback_url}"
      />
    </form>
     <script type="text/javascript">
        window.onload = function(){
            document.forms['redirect'].submit();
        }
    </script>
        `,
      );
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  @Post('/webhook')
  async webhook(@Body() body: any, @Res() res: any) {
    const details = JSON.stringify(body);

    const webhook = await new this.databaseService.WebhooksModel({
      // collect_id:new Types.ObjectId(collect_id),
      body: details,
      gateway: Gateway.EDVIRON_HDFC_RAZORPAY,
    }).save();

    const { payload } = body;
    const { order_id, amount, method, bank, acquirer_data, error_reason, card, card_id, wallet } =
      payload.payment.entity;
    let { status } = payload.payment.entity;
    const { created_at } = payload.payment.entity;
    const { receipt } = payload.order.entity;
    try {
      const collect_id = receipt;

      try {
        const webhook = await new this.databaseService.WebhooksModel({
          collect_id: new Types.ObjectId(collect_id),
          body: details,
          gateway: Gateway.EDVIRON_HDFC_RAZORPAY,
        }).save();
      } catch (e) {
        await new this.databaseService.WebhooksModel({
          body: details,
          gateway: Gateway.EDVIRON_HDFC_RAZORPAY,
        }).save();
      }

      const collectIdObject = new Types.ObjectId(collect_id);
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(
          collectIdObject,
        );
      if (!collectReq) throw new Error('Collect request not found');

      const transaction_amount = amount / 100 || null;
      let payment_method = method || null;
      if (payment_method === 'netbanking') {
        payment_method = 'net_banking';
      }

      let detail;

      switch (payment_method) {
        case 'upi':
          detail = {
            upi: {
              channel: null,
              upi_id: payload.payment.entity.vpa || null,
            }
          };
          break;

        case 'card':
          detail = {
            card: {
              card_bank_name: card.type || null,
              card_country: card.international === false ? "IN" : card.international === true ? "OI" : null,
              card_network: card.network || null,
              card_number: card_id || null,
              card_sub_type: card.sub_type || null,
              card_type: card.type || null,
              channel: null
            }
          };
          break;

        case 'netbanking':
          detail = {
            netbanking: {
              channel: null,
              netbanking_bank_code: acquirer_data.bank_transaction_id,
              netbanking_bank_name: bank,
            }
          };
          break;

        case 'wallet':
          detail = {
            wallet: {
              channel: wallet,
              provider: wallet
            }
          };
          break;

        default:
          detail = {};
      }

      const pendingCollectReq =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: collectIdObject,
        });

      if (
        pendingCollectReq &&
        pendingCollectReq.status !== PaymentStatus.PENDING
      ) {
        res.status(200).send('OK');
        return;
      }

      if (status.toLowerCase() == 'captured') {
        status = 'SUCCESS';
      }
      const orderPaymentDetail = {
        bank: bank,
        transaction_id: acquirer_data.bank_transaction_id,
        method: method,
      };

      const updateReq =
        await this.databaseService.CollectRequestStatusModel.updateOne(
          {
            collect_id: collectIdObject,
          },
          {
            $set: {
              status: status,
              payment_time: new Date(created_at * 1000),
              transaction_amount,
              payment_method,
              details: JSON.stringify(detail),
              bank_reference: acquirer_data.bank_transaction_id,
              reason: error_reason,
              payment_message: error_reason,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );

      res.status(200).send('OK');
    } catch (e) {
      // console.log(e);
      // console.log(e.message);

      throw new BadRequestException(e.message);
    }
  }
}
