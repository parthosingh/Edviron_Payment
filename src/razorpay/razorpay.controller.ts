import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  Param,
} from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { DatabaseService } from '../database/database.service';
import * as _jwt from 'jsonwebtoken';
import { Gateway } from 'src/database/schemas/collect_request.schema';

@Controller('razorpay')
export class RazorpayController {
  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly databaseService: DatabaseService,
  ) {}

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
      const isValid = this.razorpayService.verifySignature(
        orderId,
        paymentId,
        signature,
      );
      if (!isValid) throw new BadRequestException('Invalid Signature');
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) throw new BadRequestException('Order Id not found');

      // const getOrderData =
      //   await this.razorpayService.checkOrderStatusByRazorpayId(orderId);

      collectRequest.gateway = Gateway.EDVIRON_RAZORPAY;
      collectRequest.paymentIds.razorpay_order_id = orderId;
      collectRequest.razorpay_seamless.payment_id = paymentId;

      await collectRequest.save();

      const paymentStatus = await this.razorpayService.checkPaymentStatus(
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
      callbackUrl.searchParams.set('reason', paymentStatus.error_reason);
      return res.redirect(callbackUrl.toString());
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  @Get('/get-dispute')
  async getDispute(
    @Query('collect_id') collect_id: string,
    @Query('dispute_id') dispute_id: string,
    @Query('token') token: string,
  ) {
    try {
      const decoded = _jwt.verify(token, process.env.KEY!) as any;
      if (decoded.collect_id !== collect_id) {
        throw new BadRequestException('Invalid token');
      }
      const collecRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collecRequest)
        throw new BadRequestException('Collect Request not found');
      const data = await this.razorpayService.getDispute(
        dispute_id,
        collecRequest.razorpay_seamless.razorpay_mid,
        collecRequest,
      );
      return data;
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }
}
