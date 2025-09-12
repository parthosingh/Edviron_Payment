import {
  Body,
  Headers,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from './edviron-pg.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { calculateSHA512Hash, sign } from '../utils/sign';
import axios from 'axios';
import { Webhooks } from 'src/database/schemas/webhooks.schema';
import { isValidObjectId, Types } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { TransactionStatus } from 'src/types/transactionStatus';
import {
  CollectRequest,
  Gateway,
} from 'src/database/schemas/collect_request.schema';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { skip } from 'node:test';
import * as qs from 'qs';
import {
  PlatformCharge,
  rangeCharge,
} from 'src/database/schemas/platform.charges.schema';
import * as _jwt from 'jsonwebtoken';
import { NttdataService } from 'src/nttdata/nttdata.service';
import { PosPaytmService } from 'src/pos-paytm/pos-paytm.service';
import { WorldlineService } from 'src/worldline/worldline.service';
import { stat } from 'fs';
import { start } from 'repl';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';

@Controller('edviron-pg')
export class EdvironPgController {
  constructor(
    private readonly edvironPgService: EdvironPgService,
    private readonly databaseService: DatabaseService,
    private readonly easebuzzService: EasebuzzService,
    private readonly cashfreeService: CashfreeService,
    private readonly nttDataService: NttdataService,
    private readonly posPaytmService: PosPaytmService,
    private readonly worldlineService: WorldlineService,
    private readonly razorpayNonseamless: RazorpayNonseamlessService,
  ) { }
  @Get('/redirect')
  async handleRedirect(@Req() req: any, @Res() res: any) {
    const wallet = req.query.wallet;
    const cardless = req.query.cardless;
    const net_banking = req.query.net_banking;
    const pay_later = req.query.pay_later;
    const upi = req.query.upi;
    const card = req.query.card;
    const school_name = req.query.school_name;
    const easebuzz_pg = req.query.easebuzz_pg;
    const payment_id = req.query.payment_id;
    const razorpay_pg = req.query.razorpay_pg;
    const razorpay_id = req.query.razorpay_id;
    const gateway = req.query.gateway;
    let disable_modes = '';
    if (wallet) disable_modes += `&wallet=${wallet}`;
    if (cardless) disable_modes += `&cardless=${cardless}`;
    if (net_banking) disable_modes += `&net_banking=${net_banking}`;
    if (pay_later) disable_modes += `&pay_later=${pay_later}`;
    if (upi) disable_modes += `&upi=${upi}`;
    if (card) disable_modes += `&card=${card}`;

    const collectReq = await this.databaseService.CollectRequestModel.findById(
      req.query.collect_request_id,
    );
    if (!collectReq) {
      throw new NotFoundException('Collect request not found');
    }
    const school_id = collectReq.school_id;
    if (collectReq.isMasterGateway) {
      res.send(
        `<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com/payments?session_id=${req.query.session_id
        }&collect_request_id=${req.query.collect_request_id
        }&amount=${req.query.amount
        }${disable_modes}&platform_charges=${encodeURIComponent(
          req.query.platform_charges,
        )}&school_name=${school_name}&easebuzz_pg=${easebuzz_pg}&razorpay_pg=${razorpay_pg}&razorpay_order_id=${razorpay_id}&payment_id=${payment_id}&school_id=${school_id}&gateway=${gateway}";

                }
            </script>`,
      );
    }
    res.send(
      `<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com?session_id=${req.query.session_id
      }&collect_request_id=${req.query.collect_request_id
      }&amount=${req.query.amount
      }${disable_modes}&platform_charges=${encodeURIComponent(
        req.query.platform_charges,
      )}&school_name=${school_name}&easebuzz_pg=${easebuzz_pg}&razorpay_pg=${razorpay_pg}&razorpay_order_id=${razorpay_id}&payment_id=${payment_id}&school_id=${school_id}";

                }
            </script>`,
    );
  }

  @Get('/sdk-redirect')
  async handleSdkRedirect(@Req() req: any, @Res() res: any) {
    const collect_id = req.query.collect_id;
    const isBlank = req.query.isBlank || false;
    if (!Types.ObjectId.isValid(collect_id)) {
      return res.redirect(
        `${process.env.PG_FRONTEND}/order-notfound?collect_id=${collect_id}`,
      );
    }
    const collectRequest =
      (await this.databaseService.CollectRequestModel.findById(collect_id))!;
    if (!collectRequest) {
      res.redirect(
        `${process.env.PG_FRONTEND}/order-notfound?collect_id=${collect_id}`,
      );
    }

    const masterGateway=collectRequest?.isMasterGateway || false;
    if(masterGateway){
      // change later to prod url
      const url=`https://qa.pg.edviron.com/payments/select-gateway?collect_id=${collectRequest._id}`
      return res.redirect(url)
    }
    
    if (collectRequest?.easebuzz_non_partner) {
      res.redirect(
        `${process.env.EASEBUZZ_ENDPOINT_PROD}/pay/${collectRequest.paymentIds.easebuzz_id}`,
      );
    }
    if (
      collectRequest &&
      collectRequest.worldline &&
      collectRequest.worldline.worldline_merchant_id
    ) {
      await this.databaseService.CollectRequestModel.updateOne(
        {
          _id: collect_id,
        },
        {
          sdkPayment: true,
        },
        {
          new: true,
        },
      );
      res.redirect(collectRequest.payment_data);
    }
    if (collectRequest?.gateway === Gateway.EDVIRON_CCAVENUE) {
      await this.databaseService.CollectRequestModel.updateOne(
        {
          _id: collect_id,
        },
        {
          sdkPayment: true,
        },
        {
          new: true,
        },
      );
      res.redirect(collectRequest.payment_data);
    }

    const axios = require('axios');
    const paymentString = JSON.parse(collectRequest?.payment_data);
    const parsedUrl = new URL(paymentString);
    const sessionId = parsedUrl.searchParams.get('session_id');
    const params = new URLSearchParams(paymentString);
    const wallet = params.get('wallet');
    const cardless = params.get('cardless');
    const netbanking = params.get('netbanking');
    const payment_id = params.get('payment_id');
    const easebuzz_pg = params.get('easebuzz_pg');
    const pay_later = params.get('pay_later');
    const upi = params.get('upi');
    const card = params.get('card');
    const session_id = params.get('session_id');
    const platform_charges = params.get('platform_charges')!;

    const amount = params.get('amount');
    let disable_modes = '';
    if (wallet) disable_modes += `&wallet=${wallet}`;
    if (cardless) disable_modes += `&cardless=${cardless}`;
    if (netbanking) disable_modes += `&netbanking=${netbanking}`;
    if (pay_later) disable_modes += `&pay_later=${pay_later}`;
    if (upi) disable_modes += `&upi=${upi}`;
    if (card) disable_modes += `&card=${card}`;

    await this.databaseService.CollectRequestModel.updateOne(
      {
        _id: collect_id,
      },
      {
        sdkPayment: true,
      },
      {
        new: true,
      },
    );
    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collect_id);

    if (collectReq?.isCFNonSeamless) {
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting to Payment...</title>
          <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
      </head>
      <body>
          <p>Redirecting to payment page...</p>
          <script>
              const cashfree = Cashfree({ mode: "production" });
              const checkoutOptions = {
                  paymentSessionId: "${sessionId}",
                  redirectTarget: "_self"
              };
              cashfree.checkout(checkoutOptions);
          </script>
      </body>
      </html>
    `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }
    const payload = { school_id: collectReq?.school_id };
    const token = jwt.sign(payload, process.env.PAYMENTS_SERVICE_SECRET!, {
      noTimestamp: true,
    });
    const data = { token, school_id: collectReq?.school_id };

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/school-info`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
      },
      data: data,
    };
    const { data: info } = await axios.request(config);
    res.send(
      `<script type="text/javascript">
                window.onload = function(){
                    location.href = "${process.env.PG_FRONTEND
      }?session_id=${sessionId}&collect_request_id=${req.query.collect_id
      }&amount=${amount}${disable_modes}&platform_charges=${encodeURIComponent(
        platform_charges,
      )}&is_blank=${isBlank}&amount=${amount}&school_name=${info.school_name
      }&easebuzz_pg=${easebuzz_pg}&payment_id=${payment_id}";
                }
            </script>`,
    );
  }

  @Get('/callback')
  async handleCallback(@Req() req: any, @Res() res: any) {
    try {
      const { collect_request_id } = req.query;
      console.log({ collect_request_id });

      const collectRequest =
        (await this.databaseService.CollectRequestModel.findById(
          collect_request_id,
        ))!;

      const info =
        await this.databaseService.CollectRequestModel.findById(
          collect_request_id,
        );
      if (!info) {
        throw new Error('transaction not found');
      }

      info.gateway = Gateway.EDVIRON_PG;
      await info.save();
      if (!collectRequest) {
        throw new NotFoundException('Collect request not found');
      }
      let status: any;
      if (
        collectRequest.cashfree_non_partner &&
        collectRequest.cashfree_credentials
      ) {
        const status2 =
          await this.cashfreeService.checkStatusV2(collect_request_id);
        status = status2.status;
      } else {
        const status1 = await this.edvironPgService.checkStatus(
          collect_request_id,
          collectRequest,
        );
        status = status1.status;
      }

      if (collectRequest?.sdkPayment) {
        if (status === `SUCCESS`) {
          const callbackUrl = new URL(collectRequest?.callbackUrl);
          callbackUrl.searchParams.set('status', 'SUCCESS');
          callbackUrl.searchParams.set(
            'EdvironCollectRequestId',
            collect_request_id,
          );
          return res.redirect(
            `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}`,
          );
        }
        console.log(`SDK payment failed for ${collect_request_id}`);

        res.redirect(
          `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}`,
        );
      }
      const callbackUrl = new URL(collectRequest?.callbackUrl);
      if (status !== `SUCCESS`) {
        callbackUrl.searchParams.set(
          'EdvironCollectRequestId',
          collect_request_id,
        );
        return res.redirect(
          `${callbackUrl.toString()}&status=cancelled&reason=Payment-declined`,
        );
      }
      if (collectRequest.isSplitPayments) {
        await this.databaseService.VendorTransactionModel.updateMany(
          { collect_id: info._id },
          { $set: { status: 'SUCCESS' } },
        );
      }
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      callbackUrl.searchParams.set('status', 'SUCCESS');
      return res.redirect(callbackUrl.toString());
    } catch (e) {
      console.log(e);
      return res.status(500).send('Internal Server Error');
    }
  }

  @Get('/easebuzz-callback')
  async handleEasebuzzCallback(@Req() req: any, @Res() res: any) {
    const { collect_request_id } = req.query;
    console.log(req.query.status, 'easebuzz callback status');

    const collectRequest =
      (await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      ))!;

    collectRequest.gateway = Gateway.EDVIRON_EASEBUZZ;
    await collectRequest.save();
    const reqToCheck = await this.easebuzzService.statusResponse(
      collect_request_id,
      collectRequest,
    );
    const status = reqToCheck.msg.status;
    if (collectRequest?.sdkPayment) {
      const callbackUrl = new URL(collectRequest?.callbackUrl);
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      if (status === `success`) {
        console.log(`SDK payment success for ${collect_request_id}`);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`,
        );
      }
      console.log(`SDK payment failed for ${collect_request_id}`);
      callbackUrl.searchParams.set('status', 'SUCCESS');

      return res.redirect(
        `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`,
      );
    }

    const callbackUrl = new URL(collectRequest?.callbackUrl);
    if (status.toLocaleLowerCase() !== `success`) {
      console.log('failure');
      let reason = reqToCheck?.msg?.error_Message || 'payment-declined';
      if (reason === 'Collect Expired') {
        reason = 'Order Expired';
      }
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      return res.redirect(
        `${callbackUrl.toString()}&status=cancelled&reason=${reason}`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
    return res.redirect(callbackUrl.toString());
  }

  @Post('/easebuzz-callback')
  async handleEasebuzzCallbackPost(@Req() req: any, @Res() res: any) {
    const { collect_request_id } = req.query;
    console.log(req.query.status, 'easebuzz callback status');

    const collectRequest =
      (await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      ))!;

    collectRequest.gateway = Gateway.EDVIRON_EASEBUZZ;
    await collectRequest.save();
    const reqToCheck = await this.easebuzzService.statusResponse(
      collect_request_id,
      collectRequest,
    );

    const status = reqToCheck.msg.status;

    if (collectRequest?.sdkPayment) {
      const callbackUrl = new URL(collectRequest?.callbackUrl);
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      if (status === `success`) {
        console.log(`SDK payment success for ${collect_request_id}`);
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}`,
        );
      }
      console.log(`SDK payment failed for ${collect_request_id}`);

      return res.redirect(
        `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}`,
      );
    }

    const callbackUrl = new URL(collectRequest?.callbackUrl);
    if (status.toLocaleLowerCase() !== `success`) {
      console.log('failure');
      let reason = reqToCheck?.msg?.error_Message || 'payment-declined';
      if (reason === 'Collect Expired') {
        reason = 'Order Expired';
      }
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      return res.redirect(
        `${callbackUrl.toString()}&status=cancelled&reason=${reason}`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
    return res.redirect(callbackUrl.toString());
  }

  // cashfree

  @Post('/webhook')
  async handleWebhook(@Body() body: any, @Res() res: any) {
    const { data: webHookData } = JSON.parse(JSON.stringify(body));
    if (!webHookData) throw new Error('Invalid webhook data');
    const { error_details } = webHookData;
    const collect_id = webHookData.order.order_id || body.order.order_id;
    if (!Types.ObjectId.isValid(collect_id)) {
      throw new Error('collect_id is not valid');
    }
    const collectIdObject = new Types.ObjectId(collect_id);
    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collectIdObject);
    if (!collectReq) throw new Error('Collect request not found');

    const transaction_amount = webHookData?.payment?.payment_amount || null;
    const payment_method = webHookData?.payment?.payment_group || null;
    const payment_message = webHookData?.payment?.payment_message || 'NA';

    const saveWebhook = await new this.databaseService.WebhooksModel({
      collect_id: collectIdObject,
      body: JSON.stringify(webHookData),
    }).save();

    const pendingCollectReq =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectIdObject,
      });
    if (
      pendingCollectReq &&
      (pendingCollectReq.status === PaymentStatus.SUCCESS ||
        pendingCollectReq.status === 'success')
    ) {
      console.log('No pending request found for', collect_id);
      res.status(200).send('OK');
      return;
    }
    collectReq.gateway = Gateway.EDVIRON_PG;
    // collectReq.payment_id = body.payment.cf_payment_id.toString() ?? '';
    await collectReq.save();

    // Auto Refund Code Replicate on easebuzz

    // try {
    //   if (
    //     pendingCollectReq &&
    //     pendingCollectReq.status === PaymentStatus.FAILED &&
    //     webHookData.payment.payment_status === 'SUCCESS'
    //   ) {
    //     const tokenData = {
    //       school_id: collectReq?.school_id,
    //       trustee_id: collectReq?.trustee_id,
    //     };

    //     const token = jwt.sign(tokenData, process.env.KEY!, {
    //       noTimestamp: true,
    //     });
    //     console.log('Refunding Duplicate Payment request');
    //     const autoRefundConfig = {
    //       method: 'POST',
    //       url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/initiate-auto-refund`,
    //       headers: {
    //         accept: 'application/json',
    //         'Content-Type': 'application/json',
    //       },
    //       data: {
    //         token,
    //         refund_amount: collectReq.amount,
    //         collect_id,
    //         school_id: collectReq.school_id,
    //         trustee_id: collectReq?.trustee_id,
    //         custom_id: collectReq.custom_order_id || 'NA',
    //         gateway: 'CASHFREE',
    //         reason: 'Auto Refund due to dual payment',
    //       },
    //     };
    //     console.time('Refunding Duplicate Payment request');
    //     const autoRefundResponse = await axios.request(autoRefundConfig);
    //     console.timeEnd('Refunding Duplicate Payment request');
    //     collectReq.gateway = Gateway.EDVIRON_PG;
    //     pendingCollectReq.isAutoRefund = true;
    //     pendingCollectReq.status = PaymentStatus.FAILED;
    //     await pendingCollectReq.save();
    //     await collectReq.save();
    //     return res.status(200).send('OK');
    //   }
    // } catch (e) {
    //   console.log(e.message, 'Error in AutoRefund');
    //   return res.status(400).send('Error in AutoRefund');
    // }

    const reqToCheck = await this.edvironPgService.checkStatus(
      collect_id,
      collectReq,
    );

    //console.log('req', reqToCheck);

    // const { status } = reqToCheck;
    const status = webHookData.payment.payment_status;
    const payment_time = new Date(webHookData.payment.payment_time);
    let webhookStatus = status;
    let paymentMode = payment_method;
    let paymentdetails: any = JSON.stringify(
      webHookData.payment.payment_method,
    );
    if (
      pendingCollectReq?.status === 'FAILED' &&
      webhookStatus === 'USER_DROPPED'
    ) {
      webhookStatus = 'FAILED';
      paymentMode = pendingCollectReq.payment_method;
      paymentdetails = pendingCollectReq.details;
    }
    // if (status == TransactionStatus.SUCCESS) {
    //   try {
    //     con st schoolInfo = await this.edvironPgService.getSchoolInfo(
    //       collectReq.school_id,
    //     );
    //     const email = schoolInfo.email;
    //     await this.edvironPgService.sendTransactionmail(email, collectReq);
    //   } catch (e) {
    //     console.log('error in sending transaction mail ');
    //   }
    // }
    // add commision and split payment to vendors
    try {
      if (status == TransactionStatus.SUCCESS) {
        let platform_type: string | null = null;
        const method = payment_method.toLowerCase() as
          | 'net_banking'
          | 'debit_card'
          | 'credit_card'
          | 'upi'
          | 'wallet'
          | 'cardless_emi'
          | 'pay_later'
          | 'corporate_card';

        const platformMap: { [key: string]: any } = {
          net_banking:
            webHookData.payment.payment_method?.netbanking
              ?.netbanking_bank_name,
          debit_card: webHookData.payment.payment_method?.card?.card_network,
          credit_card: webHookData.payment.payment_method?.card?.card_network,
          upi: 'Others',
          wallet: webHookData.payment.payment_method?.app?.provider,
          cardless_emi:
            webHookData.payment.payment_method?.cardless_emi?.provider,
          pay_later: webHookData.payment?.payment_method?.pay_later?.provider,
        };

        const methodMap: { [key: string]: string } = {
          net_banking: 'NetBanking',
          debit_card: 'DebitCard',
          credit_card: 'CreditCard',
          upi: 'UPI',
          wallet: 'Wallet',
          cardless_emi: 'CardLess EMI',
          pay_later: 'PayLater',
          corporate_card: 'CORPORATE CARDS',
        };

        platform_type = platformMap[method];

        const mappedPaymentMethod = methodMap[method];

        const axios = require('axios');

        const tokenData = {
          school_id: collectReq?.school_id,
          trustee_id: collectReq?.trustee_id,
          order_amount: pendingCollectReq?.order_amount,
          transaction_amount,
          platform_type: mappedPaymentMethod,
          payment_mode: platform_type,
          collect_id: collectReq._id,
        };

        const _jwt = jwt.sign(tokenData, process.env.KEY!, {
          noTimestamp: true,
        });

        let data = JSON.stringify({
          token: _jwt,
          school_id: collectReq?.school_id,
          trustee_id: collectReq?.trustee_id,
          order_amount: pendingCollectReq?.order_amount,
          transaction_amount,
          platform_type: mappedPaymentMethod,
          payment_mode: platform_type,
          collect_id: collectReq._id,
        });

        // save commission data on trustee service

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
          console.log('Commission calculation response:', commissionRes);
        } catch (error) {
          console.error('Error calculating commission:', error.message);
        }
      }
    } catch (e) {
      console.log('Error in saving Commission');
    }

    if (collectReq.isSplitPayments) {
      try {
        const vendor =
          await this.databaseService.VendorTransactionModel.updateMany(
            {
              collect_id: collectReq._id,
            },
            {
              $set: {
                payment_time: payment_time,
                status: webhookStatus,
                gateway: Gateway.EDVIRON_PG,
              },
            },
          );
      } catch (e) {
        console.log('Error in updating vendor transactions');
      }
    }
    const updateReq =
      await this.databaseService.CollectRequestStatusModel.updateOne(
        {
          collect_id: collectIdObject,
        },
        {
          $set: {
            status: webhookStatus,
            transaction_amount,
            payment_method: paymentMode,
            details: paymentdetails,
            bank_reference: webHookData.payment.bank_reference,
            payment_time,
            reason: payment_message || 'NA',
            payment_message: payment_message || 'NA',
            error_details: {
              error_description: error_details?.error_description || 'NA',
              error_source: error_details?.error_source || 'NA',
              error_reason: error_details?.error_reason || 'NA',
            },
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

    const webHookUrl = collectReq?.req_webhook_urls;

    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    const collectRequestStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectIdObject,
      });
    if (!collectRequestStatus) {
      throw new Error('Collect Request Not Found');
    }

    const transactionTime = collectRequestStatus.updatedAt;
    if (!transactionTime) {
      throw new Error('Transaction Time Not Found');
    }

    const amount = reqToCheck?.amount;
    const custom_order_id = collectRequest?.custom_order_id || '';
    const additional_data = collectRequest?.additional_data || '';
    const webHookDataInfo = {
      collect_id,
      amount,
      status,
      trustee_id: collectReq.trustee_id,
      school_id: collectReq.school_id,
      req_webhook_urls: collectReq?.req_webhook_urls,
      custom_order_id,
      createdAt: collectRequestStatus?.createdAt,
      transaction_time: payment_time || collectRequestStatus?.updatedAt,
      additional_data,
      details: collectRequestStatus.details,
      transaction_amount: collectRequestStatus.transaction_amount,
      bank_reference: collectRequestStatus.bank_reference,
      payment_method: collectRequestStatus.payment_method,
      payment_details: collectRequestStatus.details,
      // formattedTransaction_time: transactionTime.toLocaleDateString('en-GB') || null,
      formattedDate: `${payment_time.getFullYear()}-${String(
        payment_time.getMonth() + 1,
      ).padStart(2, '0')}-${String(payment_time.getDate()).padStart(2, '0')}`,
    };

    if (webHookUrl !== null) {
      console.log('calling webhook');
      let webhook_key: null | string = null;
      try {
        const token = _jwt.sign(
          { trustee_id: collectReq.trustee_id.toString() },
          process.env.KEY!,
        );
        const config = {
          method: 'get',
          maxBodyLength: Infinity,
          url: `${process.env.VANILLA_SERVICE_ENDPOINT
            }/main-backend/get-webhook-key?token=${token}&trustee_id=${collectReq.trustee_id.toString()}`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
        };
        const { data } = await axios.request(config);
        webhook_key = data?.webhook_key;
      } catch (error) {
        console.error('Error getting webhook key:', error.message);
      }

      if (
        collectRequest?.trustee_id.toString() === '66505181ca3e97e19f142075'
      ) {
        console.log('Webhook called for webschool');
        setTimeout(async () => {
          try {
            await this.edvironPgService.sendErpWebhook(
              webHookUrl,
              webHookDataInfo,
              webhook_key,
            );
          } catch (e) {
            console.log(`Error sending webhook to ${webHookUrl}:`, e.message);
          }
        }, 60000);
      } else {
        console.log('Webhook called for other schools');
        console.log(webHookDataInfo);
        try {
          await this.edvironPgService.sendErpWebhook(
            webHookUrl,
            webHookDataInfo,
            webhook_key,
          );
        } catch (e) {
          console.log(`Error sending webhook to ${webHookUrl}:`, e.message);
        }
      }
    }

    // if (webHookUrl !== null) {
    //   const amount = reqToCheck?.amount;
    //   const webHookData = await sign({
    //     collect_id,
    //     amount,
    //     status,
    //     trustee_id: collectReq.trustee_id,
    //     school_id: collectReq.school_id,
    //     req_webhook_urls: collectReq?.req_webhook_urls,
    //     custom_order_id,
    //     createdAt: collectRequestStatus?.createdAt,
    //     transaction_time: collectRequestStatus?.updatedAt,
    //     additional_data,
    //   });

    //   const createConfig = (url: string) => ({
    //     method: 'post',
    //     maxBodyLength: Infinity,
    //     url: url,
    //     headers: {
    //       accept: 'application/json',
    //       'content-type': 'application/json',
    //     },
    //     data: webHookData,
    //   });
    //   try {
    //     try {
    //       const sendWebhook = (url: string) => {
    //         axios
    //           .request(createConfig(url))
    //           .then(() => console.log(`Webhook sent to ${url}`))
    //           .catch((error) =>
    //             console.error(
    //               `Error sending webhook to ${url}:`,
    //               error.message,
    //             ),
    //           );
    //       };

    //       webHookUrl.forEach(sendWebhook);
    //     } catch (error) {
    //       console.error('Error in webhook sending process:', error);
    //     }
    //   } catch (error) {
    //     console.error('Error sending webhooks:', error);
    //   }
    //   // const config = {
    //   //   method: 'post',
    //   //   maxBodyLength: Infinity,
    //   //   url: `${webHookUrl}`,
    //   //   headers: {
    //   //     accept: 'application/json',
    //   //     'content-type': 'application/json',
    //   //   },
    //   //   data: webHookData,
    //   // };
    //   // // const webHookSent = await axios.request(config);
    //   // console.log(`webhook sent to ${webHookUrl} with data ${webHookSent}`);
    // }
    try {
      await this.edvironPgService.sendMailAfterTransaction(
        collectIdObject.toString(),
      );
    } catch (e) {
      await this.databaseService.ErrorLogsModel.create({
        type: 'sendMailAfterTransaction',
        des: collectIdObject.toString(),
        identifier: 'EdvironPg webhook',
        body: e.message || e.toString(),
      });
    }
    res.status(200).send('OK');
  }

  @Post('/easebuzz/webhook')
  async easebuzzWebhook(@Body() body: any, @Res() res: any) {
    console.log('easebuzz webhook recived with data', body);

    if (!body) throw new Error('Invalid webhook data');
    let collect_id = body.txnid;
    if (collect_id.startsWith('upi_')) {
      collect_id = collect_id.replace('upi_', '');
    }
    console.log('webhook for ', collect_id);

    if (!Types.ObjectId.isValid(collect_id)) {
      throw new Error('collect_id is not valid');
    }
    const collectIdObject = new Types.ObjectId(collect_id);

    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collectIdObject);
    if (!collectReq) throw new Error('Collect request not found');

    collectReq.gateway = Gateway.EDVIRON_EASEBUZZ;
    await collectReq.save();
    const transaction_amount = body.net_amount_debit || null;
    // const payment_method = body.mode || null;
    let payment_method;
    let details;

    const saveWebhook = await new this.databaseService.WebhooksModel({
      collect_id: collectIdObject,
      body: JSON.stringify(body),
    }).save();

    const pendingCollectReq =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectIdObject,
      });
    if (
      pendingCollectReq &&
      pendingCollectReq.status !== PaymentStatus.PENDING
    ) {
      console.log('No pending request found for', collect_id);
      res.status(200).send('OK');
      return;
    }
    // Auto Refund for Duplicate Payment
    if (collectReq.school_id === '65d443168b8aa46fcb5af3e4') {
      try {
        if (
          pendingCollectReq &&
          pendingCollectReq.status !== PaymentStatus.PENDING &&
          pendingCollectReq.status !== PaymentStatus.SUCCESS
        ) {
          console.log('Auto Refund for Duplicate Payment ', collect_id);
          const tokenData = {
            school_id: collectReq?.school_id,
            trustee_id: collectReq?.trustee_id,
          };
          const token = jwt.sign(tokenData, process.env.KEY!, {
            noTimestamp: true,
          });
          const autoRefundConfig = {
            method: 'POST',
            url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/initiate-auto-refund`,
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: {
              token,
              refund_amount: collectReq.amount,
              collect_id,
              school_id: collectReq.school_id,
              trustee_id: collectReq?.trustee_id,
              custom_id: collectReq.custom_order_id || 'NA',
              gateway: 'EASEBUZZ',
              reason: 'Auto Refund due to dual payment',
            },
          };
          const autoRefundResponse = await axios.request(autoRefundConfig);
          console.log(autoRefundResponse.data, 'refund');
          const refund_id = autoRefundResponse.data._id.toString();
          const refund_amount = autoRefundResponse.data.refund_amount;
          const refund_process = await this.easebuzzService.initiateRefund(
            collect_id,
            refund_amount,
            refund_id,
          );
          console.log('Auto refund Initiated', refund_process);
          pendingCollectReq.isAutoRefund = true;
          pendingCollectReq.status = PaymentStatus.FAILURE;
          await pendingCollectReq.save();
          return res.status(200).send('OK');
        }
      } catch (e) {
        console.log(e);
      }
    }

    const statusResponse = await this.edvironPgService.easebuzzCheckStatus(
      body.txnid,
      collectReq,
    );
    const reqToCheck = statusResponse;
    console.log(statusResponse, 'status response check');

    const status = reqToCheck.msg.status;
    let platform_type;
    // let payment_mode
    switch (body.mode) {
      case 'MW':
        payment_method = 'wallet';
        platform_type = 'Wallet';
        details = {
          app: {
            channel: reqToCheck.msg.bank_name,
            provider: reqToCheck.msg.bank_name,
          },
        };
        break;
      case 'OM':
        payment_method = 'wallet';
        platform_type = 'Wallet';
        details = {
          app: {
            channel: reqToCheck.msg.bank_name,
            provider: reqToCheck.msg.bank_name,
          },
        };
        break;
      case 'NB':
        payment_method = 'net_banking';
        platform_type = 'NetBanking';
        details = {
          netbanking: {
            netbanking_bank_code: reqToCheck.msg.bank_code,
            netbanking_bank_name: reqToCheck.msg.bank_name,
          },
        };
        break;
      case 'CC':
        payment_method = 'credit_card';
        platform_type = 'CreditCard';
        details = {
          card: {
            card_bank_name: reqToCheck.msg.bank_name,
            provicard_network: reqToCheck.msg.cardCategory,
            card_number: reqToCheck.msg.cardnum,
            card_type: 'credit_card',
          },
        };
        break;
      case 'DC':
        payment_method = 'debit_card';
        platform_type = 'DebitCard';
        details = {
          card: {
            card_bank_name: reqToCheck.msg.bank_name,
            provicard_network: reqToCheck.msg.cardCategory,
            card_number: reqToCheck.msg.cardnum,
            card_type: 'debit_card',
          },
        };
        break;
      case 'UPI':
        payment_method = 'upi';
        platform_type = 'Others';
        details = {
          upi: {
            upi_id: reqToCheck.msg.upi_va,
          },
        };
        break;
      case 'PL':
        payment_method = 'pay_later';
        platform_type = 'PayLater';
        details = {
          pay_later: {
            channel: reqToCheck.msg.bank_name,
            provider: reqToCheck.msg.bank_name,
          },
        };
        break;
      default:
        payment_method = 'Unknown';
    }
    // Commission adding
    if (statusResponse.msg.status.toUpperCase() === 'SUCCESS') {
      try {
        const schoolInfo = await this.edvironPgService.getSchoolInfo(
          collectReq.school_id,
        );
        const email = schoolInfo.email;
        // await this.edvironPgService.sendTransactionmail(email, collectReq);
      } catch (e) {
        console.log('error in sending transaction mail ');
      }
      const payment_mode = body.bank_name;

      const tokenData = {
        school_id: collectReq?.school_id,
        trustee_id: collectReq?.trustee_id,
        order_amount: pendingCollectReq?.order_amount,
        transaction_amount,
        platform_type,
        payment_mode,
        collect_id: collectReq?._id,
      };
      const _jwt = jwt.sign(tokenData, process.env.KEY!, { noTimestamp: true });

      let data = JSON.stringify({
        token: _jwt,
        school_id: collectReq?.school_id,
        trustee_id: collectReq?.trustee_id,
        order_amount: pendingCollectReq?.order_amount,
        transaction_amount,
        platform_type,
        payment_mode,
        collect_id: collectReq?._id,
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
    }
    try {
      if (collectReq.isSplitPayments) {
        try {
          const vendor =
            await this.databaseService.VendorTransactionModel.updateMany(
              {
                collect_id: collectReq._id,
              },
              {
                $set: {
                  payment_time: new Date(body.addedon),
                  status: status,
                  gateway: Gateway.EDVIRON_EASEBUZZ,
                },
              },
            );
        } catch (e) {
          console.log('Error in updating vendor transactions');
        }
      }
    } catch (e) {
      console.log(e);
    }

    const payment_time = new Date(body.addedon);
    const updateReq =
      await this.databaseService.CollectRequestStatusModel.updateOne(
        {
          collect_id: collectIdObject,
        },
        {
          $set: {
            status,
            transaction_amount,
            payment_method,
            details: JSON.stringify(details),
            bank_reference: body.bank_ref_num,
            payment_time,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

    const webHookUrl = collectReq?.req_webhook_urls;
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    const collectRequestStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectIdObject,
      });

    if (!collectRequestStatus) {
      throw new Error('Collect Request Not Found');
    }
    const transactionTime = collectRequestStatus.updatedAt;
    if (!transactionTime) {
      throw new Error('Transaction Time Not Found');
    }

    const amount = reqToCheck?.amount;
    const custom_order_id = collectRequest?.custom_order_id || '';
    const additional_data = collectRequest?.additional_data || '';
    const webHookDataInfo = {
      collect_id,
      amount,
      status,
      trustee_id: collectReq.trustee_id,
      school_id: collectReq.school_id,
      req_webhook_urls: collectReq?.req_webhook_urls,
      custom_order_id,
      createdAt: collectRequestStatus?.createdAt,
      transaction_time: payment_time || collectRequestStatus?.updatedAt,
      additional_data,
      details: collectRequestStatus.details,
      transaction_amount: collectRequestStatus.transaction_amount,
      bank_reference: collectRequestStatus.bank_reference,
      payment_method: collectRequestStatus.payment_method,
      payment_details: collectRequestStatus.details,
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
        collectRequest?.trustee_id.toString() === '66505181ca3e97e19f142075'
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

        await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo);
      }
    }

    try {
      await this.edvironPgService.sendMailAfterTransaction(
        collectIdObject.toString(),
      );
    } catch (e) {
      await this.databaseService.ErrorLogsModel.create({
        type: 'sendMailAfterTransaction',
        des: collectIdObject.toString(),
        identifier: 'EdvironPg webhook',
        body: e.message || e.toString(),
      });
    }
    res.status(200).send('OK');
    return;
  }
  @Get('transactions-report')
  async transactionsReport(
    @Body()
    body: {
      school_id: string;
      token: string;
    },
    @Res() res: any,
    @Req() req: any,
  ) {
    const { school_id, token } = body;
    if (!token) throw new Error('Token not provided');
    console.log(`getting transaction report`);

    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;

      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      const status = req.query.status || null;

      let decrypted = jwt.verify(token, process.env.KEY!) as any;
      if (
        JSON.stringify({
          ...JSON.parse(JSON.stringify(decrypted)),
          iat: undefined,
          exp: undefined,
        }) !==
        JSON.stringify({
          school_id,
        })
      ) {
        throw new ForbiddenException('Request forged');
      }

      const orders = await this.databaseService.CollectRequestModel.find({
        school_id: school_id,
      }).select('_id');

      if (orders.length == 0) {
        console.log('No orders found for client_id', school_id);
        res.status(201).send({ transactions: [], totalTransactions: 0 });
        return;
      }

      const orderIds = orders.map((order: any) => order._id);

      let query: any = {
        collect_id: { $in: orderIds },
      };

      if (startDate && endDate) {
        query = {
          ...query,
          createdAt: {
            $gte: new Date(startDate),
            $lt: new Date(endDate),
          },
        };
      }

      if (status === 'SUCCESS' || status === 'PENDING') {
        query = {
          ...query,
          status: { $in: [status.toLowerCase(), status.toUpperCase()] },
        };
      }

      const transactionsCount =
        await this.databaseService.CollectRequestStatusModel.countDocuments(
          query,
        );

      const transactions =
        await this.databaseService.CollectRequestStatusModel.aggregate([
          {
            $match: query,
          },
          {
            $lookup: {
              from: 'collectrequests',
              localField: 'collect_id',
              foreignField: '_id',
              as: 'collect_request',
            },
          },
          {
            $unwind: '$collect_request',
          },
          {
            $project: {
              _id: 0,
              __v: 0,
              'collect_request._id': 0,
              'collect_request.__v': 0,
              'collect_request.createdAt': 0,
              'collect_request.updatedAt': 0,
              'collect_request.callbackUrl': 0,
              'collect_request.clientId': 0,
              'collect_request.clientSecret': 0,
              'collect_request.webHookUrl': 0,
              'collect_request.disabled_modes': 0,
              'collect_request.gateway': 0,
              'collect_request.amount': 0,
              'collect_request.trustee_id': 0,
              'collect_request.sdkPayment': 0,
              'collect_request.payment_data': 0,
              'collect_request.ccavenue_merchant_id': 0,
              'collect_request.ccavenue_access_code': 0,
              'collect_request.ccavenue_working_key': 0,
              'collect_request.easebuzz_sub_merchant_id': 0,
              'collect_request.paymentIds': 0,
              'collect_request.deepLink': 0,
            },
          },

          {
            $project: {
              collect_id: 1,
              collect_request: 1,
              status: 1,
              transaction_amount: 1,
              order_amount: 1,
              payment_method: 1,
              details: 1,
              bank_reference: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
          {
            $addFields: {
              collect_request: {
                $mergeObjects: [
                  '$collect_request',
                  {
                    status: '$status',
                    transaction_amount: '$transaction_amount',
                    payment_method: '$payment_method',
                    details: '$details',
                    bank_reference: '$bank_reference',
                    collect_id: '$collect_id',
                    order_amount: '$order_amount',
                    merchant_id: '$collect_request.school_id',
                    currency: 'INR',
                    createdAt: '$createdAt',
                    updatedAt: '$updatedAt',
                    transaction_time: '$updatedAt',
                    custom_order_id: '$collect_request.custom_order_id',
                    isSplitPayments: '$collect_request.isSplitPayments',
                    vendors_info: '$collect_request.vendors_info',
                  },
                ],
              },
            },
          },
          {
            $replaceRoot: { newRoot: '$collect_request' },
          },
          {
            $project: {
              school_id: 0,
            },
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: Number(limit),
          },
        ]);

      res
        .status(201)
        .send({ transactions, totalTransactions: transactionsCount });
    } catch (error) {
      console.log(error);
      if (error.name === 'JsonWebTokenError')
        throw new UnauthorizedException('JWT invalid');
      throw error;
    }
  }

  @Get('transaction-info')
  async getTransactionInfo(
    @Body()
    body: {
      school_id: string;
      collect_request_id: string;
      token: string;
    },
  ) {
    const { school_id, collect_request_id, token } = body;
    try {
      if (!collect_request_id) {
        throw new Error('Collect request id not provided');
      }
      if (!token) throw new Error('Token not provided');
      let decrypted = jwt.verify(token, process.env.KEY!) as any;

      if (decrypted.school_id != school_id) {
        throw new ForbiddenException('Request forged');
      }

      if (decrypted.collect_request_id != collect_request_id) {
        throw new ForbiddenException('Request forged');
      }

      let transactions =
        await this.databaseService.CollectRequestStatusModel.aggregate([
          {
            $match: {
              collect_id: new Types.ObjectId(collect_request_id),
            },
          },
          {
            $lookup: {
              from: 'collectrequests',
              localField: 'collect_id',
              foreignField: '_id',
              as: 'collect_request',
            },
          },
          {
            $unwind: '$collect_request',
          },
          {
            $project: {
              _id: 0,
              __v: 0,
              'collect_request._id': 0,
              'collect_request.__v': 0,
              'collect_request.createdAt': 0,
              'collect_request.updatedAt': 0,
              'collect_request.callbackUrl': 0,
              'collect_request.clientId': 0,
              'collect_request.clientSecret': 0,
              'collect_request.webHookUrl': 0,
              'collect_request.disabled_modes': 0,
              'collect_request.gateway': 0,
              'collect_request.amount': 0,
              'collect_request.trustee_id': 0,
              'collect_request.sdkPayment': 0,
              'collect_request.payment_data': 0,
              'collect_request.ccavenue_merchant_id': 0,
              'collect_request.ccavenue_access_code': 0,
              'collect_request.ccavenue_working_key': 0,
              'collect_request.easebuzz_sub_merchant_id': 0,
              'collect_request.paymentIds': 0,
              'collect_request.deepLink': 0,
            },
          },

          {
            $project: {
              collect_id: 1,
              collect_request: 1,
              status: 1,
              transaction_amount: 1,
              order_amount: 1,
              payment_method: 1,
              details: 1,
              bank_reference: 1,
              createdAt: 1,
              updatedAt: 1,
              isPosTransaction: 1,
            },
          },
          {
            $addFields: {
              collect_request: {
                $mergeObjects: [
                  '$collect_request',
                  {
                    status: '$status',
                    transaction_amount: '$transaction_amount',
                    payment_method: '$payment_method',
                    details: '$details',
                    bank_reference: '$bank_reference',
                    collect_id: '$collect_id',
                    order_amount: '$order_amount',
                    merchant_id: '$collect_request.school_id',
                    currency: 'INR',
                    createdAt: '$createdAt',
                    updatedAt: '$updatedAt',
                    isSplitPayments: '$collect_request.isSplitPayments',
                    vendors_info: '$collect_request.vendors_info',
                  },
                ],
              },
            },
          },
          {
            $replaceRoot: { newRoot: '$collect_request' },
          },
          {
            $project: {
              school_id: 0,
            },
          },
          {
            $sort: { createdAt: -1 },
          },
        ]);

      const collect_request =
        await this.databaseService.CollectRequestModel.findById(
          collect_request_id,
        );
      let paymentId: string | null = null;
      if (collect_request) {
        try {
          paymentId = await this.edvironPgService.getPaymentId(
            collect_request_id.toString(),
            collect_request,
          );
          if (paymentId) {
            paymentId = paymentId?.toString();
          }
        } catch (e) {
          paymentId = null;
        }
      }
      try {
        transactions[0].paymentId = paymentId;
      } catch (e) {
        console.log('Error setting paymentId:', e);
      }
      console.log(transactions, 'transactions found');

      return transactions;
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  @Get('transaction-info/order')
  async getTransactionInfoOrder(
    @Body()
    body: {
      school_id: string;
      order_id: string;
      token: string;
    },
  ) {
    const { school_id, order_id, token } = body;
    try {
      if (!order_id) {
        throw new Error('Collect request id not provided');
      }
      if (!token) throw new Error('Token not provided');
      let decrypted = jwt.verify(token, process.env.KEY!) as any;

      if (decrypted.school_id != school_id) {
        throw new ForbiddenException('Request forged');
      }

      if (decrypted.collect_request_id != order_id) {
        throw new ForbiddenException('Request forged');
      }

      const request = await this.databaseService.CollectRequestModel.findOne({
        custom_order_id: order_id,
      });
      if (!request) {
        throw new BadRequestException('Invalid Order id');
      }

      const transactions =
        await this.databaseService.CollectRequestStatusModel.aggregate([
          {
            $match: {
              collect_id: request._id,
            },
          },
          {
            $lookup: {
              from: 'collectrequests',
              localField: 'collect_id',
              foreignField: '_id',
              as: 'collect_request',
            },
          },
          {
            $unwind: '$collect_request',
          },
          {
            $project: {
              _id: 0,
              __v: 0,
              'collect_request._id': 0,
              'collect_request.__v': 0,
              'collect_request.createdAt': 0,
              'collect_request.updatedAt': 0,
              'collect_request.callbackUrl': 0,
              'collect_request.clientId': 0,
              'collect_request.clientSecret': 0,
              'collect_request.webHookUrl': 0,
              'collect_request.disabled_modes': 0,
              'collect_request.gateway': 0,
              'collect_request.amount': 0,
              'collect_request.trustee_id': 0,
              'collect_request.sdkPayment': 0,
              'collect_request.payment_data': 0,
              'collect_request.ccavenue_merchant_id': 0,
              'collect_request.ccavenue_access_code': 0,
              'collect_request.ccavenue_working_key': 0,
              'collect_request.easebuzz_sub_merchant_id': 0,
              'collect_request.paymentIds': 0,
              'collect_request.deepLink': 0,
            },
          },

          {
            $project: {
              collect_id: 1,
              collect_request: 1,
              status: 1,
              transaction_amount: 1,
              order_amount: 1,
              payment_method: 1,
              details: 1,
              bank_reference: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
          {
            $addFields: {
              collect_request: {
                $mergeObjects: [
                  '$collect_request',
                  {
                    status: '$status',
                    transaction_amount: '$transaction_amount',
                    payment_method: '$payment_method',
                    details: '$details',
                    bank_reference: '$bank_reference',
                    collect_id: '$collect_id',
                    order_amount: '$order_amount',
                    merchant_id: '$collect_request.school_id',
                    currency: 'INR',
                    createdAt: '$createdAt',
                    updatedAt: '$updatedAt',
                    isSplitPayments: '$collect_request.isSplitPayments',
                    vendors_info: '$collect_request.vendors_info',
                  },
                ],
              },
            },
          },
          {
            $replaceRoot: { newRoot: '$collect_request' },
          },
          {
            $project: {
              school_id: 0,
            },
          },
          {
            $sort: { createdAt: -1 },
          },
        ]);

      return transactions;
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  @Get('bulk-transactions-report')
  async bulkTransactions(
    @Body()
    body: {
      trustee_id: string;
      token: string;
      searchParams?: string;
      isCustomSearch?: boolean;
      seachFilter?: string;
      payment_modes?: string[];
      isQRCode?: boolean;
      gateway?: string[];
    },
    @Res() res: any,
    @Req() req: any,
  ) {
    console.time('bulk-transactions-report');
    const {
      trustee_id,
      token,
      searchParams,
      isCustomSearch,
      seachFilter,

      isQRCode,
      gateway,
    } = body;
    let { payment_modes } = body;
    if (!token) throw new Error('Token not provided');

    if (payment_modes?.includes('upi')) {
      payment_modes = [...payment_modes, 'upi_credit_card']; //debit_card
    }

    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      const status = req.query.status || null;
      const school_id = req.query.school_id || null;
      console.log(school_id, 'CHECKING SCHOOL ID');

      const startOfDayUTC = new Date(
        await this.edvironPgService.convertISTStartToUTC(startDate),
      ); // Start of December 6 in IST
      const endOfDayUTC = new Date(
        await this.edvironPgService.convertISTEndToUTC(endDate),
      );
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      // endOfDay.setHours(23, 59, 59, 999);

      const endOfDay = new Date(endDate);
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      endOfDay.setHours(23, 59, 59, 999);

      let collectQuery: any = {
        trustee_id: trustee_id,
        createdAt: {
          $gte: startOfDayUTC,
          $lt: endOfDayUTC,
        },
      };
      if (seachFilter === 'student_info') {
        collectQuery = {
          // ...collectQuery,
          trustee_id: trustee_id,
          additional_data: { $regex: searchParams, $options: 'i' },
        };
      }

      if (school_id !== null && school_id !== 'null') {
        console.log(school_id, 'school_id');
        collectQuery = {
          ...collectQuery,
          school_id: school_id,
        };
      }

      if (isQRCode) {
        collectQuery = {
          ...collectQuery,
          isQRPayment: true,
        };
      }
      if (gateway) {
        collectQuery = {
          ...collectQuery,
          gateway: { $in: gateway },
        };
      }
      let decrypted = jwt.verify(token, process.env.KEY!) as any;
      if (
        JSON.stringify({
          ...JSON.parse(JSON.stringify(decrypted)),
          iat: undefined,
          exp: undefined,
        }) !==
        JSON.stringify({
          trustee_id,
        })
      ) {
        throw new ForbiddenException('Request forged');
      }

      console.time('fetching all transaction');
      console.log(`collectQuery`, collectQuery);
      const orders =
        await this.databaseService.CollectRequestModel.find(
          collectQuery,
        ).select('_id');

      // console.log(orders, 'order');

      let transactions: any[] = [];
      const orderIds = orders.map((order: any) => order._id);

      console.timeEnd('fetching all transaction');
      let query: any = {
        collect_id: { $in: orderIds },
      };

      if (startDate && endDate) {
        query = {
          ...query,
          $or: [
            {
              payment_time: {
                $ne: null, // Matches documents where payment_time exists and is not null
                $gte: startOfDayUTC,
                $lt: endOfDayUTC,
              },
            },
            {
              $and: [
                { payment_time: { $eq: null } }, // Matches documents where payment_time is null or doesn't exist
                {
                  updatedAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                  },
                },
              ],
            },
          ],
        };
      }

      console.log(`getting transaction`);

      if (
        status === 'SUCCESS' ||
        status === 'PENDING' ||
        status === 'USER_DROPPED'
      ) {
        query = {
          ...query,
          status: { $in: [status.toLowerCase(), status.toUpperCase()] },
        };
      } else if (status === 'FAILED') {
        query = {
          ...query,
          status: { $in: ['FAILED', 'FAILURE', 'failure'] },
        };
      }

      if (payment_modes) {
        query = {
          ...query,
          payment_method: { $in: payment_modes },
        };
      }

      if (seachFilter === 'upi_id') {
        query = {
          ...query,
          details: { $regex: searchParams },
        };
      }

      if (seachFilter === 'bank_reference') {
        const newOrders =
          await this.databaseService.CollectRequestStatusModel.findOne({
            bank_reference: { $regex: searchParams },
          });
        if (!newOrders)
          throw new NotFoundException('No record found for Input');
        const request = await this.databaseService.CollectRequestModel.findOne({
          _id: newOrders.collect_id,
          trustee_id,
        });
        if (!request) {
          throw new NotFoundException('No record found for Input');
        }

        query = {
          collect_id: newOrders.collect_id,
        };
      }
      // const transactionsCount =
      //   await this.databaseService.CollectRequestModel.find({
      //     trustee_id: trustee_id,
      //     createdAt: {
      //       $gte: new Date(startDate),
      //       $lt: endOfDay,
      //     },
      //   }).select('_id');

      console.time('aggregating transaction');
      if (
        seachFilter === 'order_id' ||
        seachFilter === 'custom_order_id' ||
        seachFilter === 'student_info'
      ) {
        console.log('Serching custom');
        let searchIfo: any = {};
        let findQuery: any = {
          trustee_id,
        };
        if (school_id !== 'null') {
          findQuery = {
            ...findQuery,
            school_id: school_id,
          };
        }
        if (seachFilter === 'order_id') {
          findQuery = {
            ...findQuery,
            _id: new Types.ObjectId(searchParams),
          };

          console.log(findQuery, 'findQuery');

          const checkReq =
            await this.databaseService.CollectRequestModel.findOne(findQuery);
          if (!checkReq)
            throw new NotFoundException('No record found for Input');
          console.log('Serching Order_id');
          searchIfo = {
            collect_id: new Types.ObjectId(searchParams),
          };
        } else if (seachFilter === 'custom_order_id') {
          findQuery = {
            ...findQuery,
            custom_order_id: searchParams,
          };
          console.log('Serching custom_order_id');
          console.log(findQuery, 'findQuery');
          const requestInfo =
            await this.databaseService.CollectRequestModel.findOne(findQuery);
          if (!requestInfo)
            throw new NotFoundException('No record found for Input');
          searchIfo = {
            collect_id: requestInfo._id,
          };
        } else if (seachFilter === 'student_info') {
          console.log('Serching student_info');
          const studentRegex = {
            $regex: searchParams,
            $options: 'i',
          };
          console.log(studentRegex);
          console.log(trustee_id, 'trustee');

          const requestInfo =
            await this.databaseService.CollectRequestModel.find({
              trustee_id: trustee_id,
              additional_data: { $regex: searchParams, $options: 'i' },
            })
              .sort({ createdAt: -1 })
              .select('_id');
          console.log(requestInfo, 'Regex');

          if (!requestInfo)
            throw new NotFoundException(`No record found for ${searchParams}`);
          const requestId = requestInfo.map((order: any) => order._id);
          searchIfo = {
            collect_id: { $in: requestId },
          };
        }
        // else if (seachFilter === 'bank_reference') {
        //   const requestInfo =
        //     await this.databaseService.CollectRequestStatusModel.findOne({
        //       bank_reference: searchParams,
        //     });
        //   if (!requestInfo)
        //     throw new NotFoundException('No record found for Input');
        //   console.log(requestInfo, 'requestInfo');
        //   searchIfo = {
        //     collect_id:  requestInfo.collect_id,
        //   };
        // }
        // else if (seachFilter === 'upi_id') {

        //   const requestInfo =
        //     await this.databaseService.CollectRequestStatusModel.find({
        //       details: { $regex: `"upi_id":"${searchParams}"`, $options: "i" }
        //     });
        //     console.log(requestInfo, "requestInfo")
        //   if (!requestInfo)
        //     throw new NotFoundException('No record found for Input');
        //     const collectId = requestInfo.map((order: any) => order.collect_id);
        //     console.log(collectId)
        //   searchIfo = {
        //     collect_id: { $in: collectId },
        //   };
        // }

        transactions =
          await this.databaseService.CollectRequestStatusModel.aggregate([
            {
              $match: searchIfo,
            },
            { $sort: { createdAt: -1 } },
            {
              $skip: (page - 1) * limit,
            },

            { $limit: Number(limit) },
            {
              $lookup: {
                from: 'collectrequests',
                localField: 'collect_id',
                foreignField: '_id',
                as: 'collect_request',
              },
            },
            {
              $unwind: '$collect_request',
            },
            {
              $project: {
                _id: 0,
                __v: 0,
                'collect_request._id': 0,
                'collect_request.__v': 0,
                'collect_request.createdAt': 0,
                'collect_request.updatedAt': 0,
                'collect_request.callbackUrl': 0,
                'collect_request.clientId': 0,
                'collect_request.clientSecret': 0,
                'collect_request.webHookUrl': 0,
                'collect_request.disabled_modes': 0,
                // 'collect_request.gateway': 0,
                'collect_request.amount': 0,
                'collect_request.trustee_id': 0,
                'collect_request.sdkPayment': 0,
                'collect_request.payment_data': 0,
                'collect_request.ccavenue_merchant_id': 0,
                'collect_request.ccavenue_access_code': 0,
                'collect_request.ccavenue_working_key': 0,
                'collect_request.easebuzz_sub_merchant_id': 0,
                'collect_request.paymentIds': 0,
                'collect_request.deepLink': 0,
                isVBAPaymentComplete: 0,
              },
            },
            {
              $project: {
                collect_id: 1,
                collect_request: 1,
                status: 1,
                transaction_amount: 1,
                order_amount: 1,
                payment_method: 1,
                details: 1,
                bank_reference: 1,
                createdAt: 1,
                updatedAt: 1,
                isAutoRefund: 1,
                payment_time: 1,
                reason: 1,
                capture_status: 1,
              },
            },
            {
              $addFields: {
                collect_request: {
                  $mergeObjects: [
                    '$collect_request',
                    {
                      status: '$status',
                      transaction_amount: '$transaction_amount',
                      payment_method: '$payment_method',
                      details: '$details',
                      bank_reference: '$bank_reference',
                      collect_id: '$collect_id',
                      order_amount: '$order_amount',
                      merchant_id: '$collect_request.school_id',
                      currency: 'INR',
                      createdAt: '$createdAt',
                      updatedAt: '$updatedAt',
                      transaction_time: '$updatedAt',
                      custom_order_id: '$collect_request.custom_order_id',
                      isSplitPayments: '$collect_request.isSplitPayments',
                      vendors_info: '$collect_request.vendors_info',
                      isAutoRefund: '$isAutoRefund',
                      payment_time: '$payment_time',
                      isQRPayment: '$collect_request.isQRPayment',
                      reason: '$reason',
                      gateway: '$gateway',
                      capture_status: '$capture_status',
                      isVBAPaymentComplete: '$isVBAPaymentComplete',
                    },
                  ],
                },
              },
            },
            {
              $replaceRoot: { newRoot: '$collect_request' },
            },
            {
              $project: {
                school_id: 0,
              },
            },
            // {
            //   $sort: { createdAt: -1 },
            // },
          ]);
        // console.log(transactions, 'transactions');
      } else {
        // console.log(query, 'else query');
        transactions =
          await this.databaseService.CollectRequestStatusModel.aggregate([
            {
              $match: query,
            },
            { $sort: { createdAt: -1 } },
            {
              $skip: (page - 1) * limit,
            },

            { $limit: Number(limit) },
            {
              $lookup: {
                from: 'collectrequests',
                localField: 'collect_id',
                foreignField: '_id',
                as: 'collect_request',
              },
            },
            {
              $unwind: '$collect_request',
            },

            {
              $project: {
                _id: 0,
                __v: 0,
                'collect_request._id': 0,
                'collect_request.__v': 0,
                'collect_request.createdAt': 0,
                'collect_request.updatedAt': 0,
                'collect_request.callbackUrl': 0,
                'collect_request.clientId': 0,
                'collect_request.clientSecret': 0,
                'collect_request.webHookUrl': 0,
                'collect_request.disabled_modes': 0,
                // 'collect_request.gateway': 0,
                'collect_request.amount': 0,
                'collect_request.trustee_id': 0,
                'collect_request.sdkPayment': 0,
                'collect_request.payment_data': 0,
                'collect_request.ccavenue_merchant_id': 0,
                'collect_request.ccavenue_access_code': 0,
                'collect_request.ccavenue_working_key': 0,
                'collect_request.easebuzz_sub_merchant_id': 0,
                'collect_request.paymentIds': 0,
                'collect_request.deepLink': 0,
                isVBAPaymentComplete: 0,
              },
            },
            {
              $project: {
                collect_id: 1,
                collect_request: 1,
                status: 1,
                transaction_amount: 1,
                order_amount: 1,
                payment_method: 1,
                details: 1,
                bank_reference: 1,
                createdAt: 1,
                updatedAt: 1,
                isAutoRefund: 1,
                payment_time: 1,
                reason: 1,
                capture_status: 1,
              },
            },
            {
              $addFields: {
                collect_request: {
                  $mergeObjects: [
                    '$collect_request',
                    {
                      status: '$status',
                      transaction_amount: '$transaction_amount',
                      payment_method: '$payment_method',
                      details: '$details',
                      bank_reference: '$bank_reference',
                      collect_id: '$collect_id',
                      order_amount: '$order_amount',
                      merchant_id: '$collect_request.school_id',
                      currency: 'INR',
                      createdAt: '$createdAt',
                      updatedAt: '$updatedAt',
                      transaction_time: '$updatedAt',
                      custom_order_id: '$collect_request.custom_order_id',
                      isSplitPayments: '$collect_request.isSplitPayments',
                      vendors_info: '$collect_request.vendors_info',
                      isAutoRefund: '$isAutoRefund',
                      payment_time: '$payment_time',
                      reason: '$reason',
                      gateway: '$gateway',
                      capture_status: '$capture_status',
                      isVBAPaymentComplete: '$isVBAPaymentComplete',
                    },
                  ],
                },
              },
            },
            {
              $replaceRoot: { newRoot: '$collect_request' },
            },
            {
              $project: {
                school_id: 0,
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            // {
            //   $skip: page,
            // },
            // {
            //   $limit: Number(limit),
            // },
          ]);
      }
      console.timeEnd('aggregating transaction');
      console.time('counting');
      const tnxCount =
        await this.databaseService.CollectRequestStatusModel.countDocuments(
          query,
        );
      console.timeEnd('counting');
      console.timeEnd('bulk-transactions-report');
      res.status(201).send({ transactions, totalTransactions: tnxCount });
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('bulk-transactions-report-csv')
  async bulkTransactionsCSV(
    @Body()
    body: {
      trustee_id: string;
      token: string;
      searchParams?: string;
      isCustomSearch?: boolean;
      seachFilter?: string;
      payment_modes?: string[];
      isQRCode?: boolean;
      gateway?: string[];
    },
    @Res() res: any,
    @Req() req: any,
  ) {
    console.time('bulk-transactions-report');
    const { trustee_id, token, searchParams, seachFilter, isQRCode, gateway } =
      body;
    let { payment_modes } = body;

    if (!token) throw new Error('Token not provided');

    // Handle UPI payment modes
    if (payment_modes?.includes('upi')) {
      payment_modes = [...payment_modes, 'upi_credit_card'];
    }

    try {
      // Parse query parameters
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      const status = req.query.status || null;
      const school_id = req.query.school_id || null;

      // Convert dates to UTC
      const startOfDayUTC = startDate
        ? new Date(await this.edvironPgService.convertISTStartToUTC(startDate))
        : null;
      const endOfDayUTC = endDate
        ? new Date(await this.edvironPgService.convertISTEndToUTC(endDate))
        : null;

      // Verify JWT token early
      const decrypted = jwt.verify(token, process.env.KEY!) as any;
      if (
        JSON.stringify({ trustee_id }) !==
        JSON.stringify({
          ...JSON.parse(JSON.stringify(decrypted)),
          iat: undefined,
          exp: undefined,
        })
      ) {
        throw new ForbiddenException('Request forged');
      }

      // Build base query
      const query: any = {};
      const collectRequestLookup: any = {
        from: 'collectrequests',
        let: { collect_id: '$collect_id' },
        pipeline: [],
        as: 'collect_request',
      };
      // 1. Handle date filters
      if (startDate && endDate) {
        query.$or = [
          {
            payment_time: { $ne: null, $gte: startOfDayUTC, $lt: endOfDayUTC },
          },
          {
            $and: [
              { payment_time: { $eq: null } },
              { updatedAt: { $gte: startOfDayUTC, $lt: endOfDayUTC } },
            ],
          },
        ];

        collectRequestLookup.pipeline.push({
          $match: {
            $expr: { $eq: ['$_id', '$$collect_id'] },
            createdAt: { $gte: startOfDayUTC, $lt: endOfDayUTC },
          },
        });
      }

      // 2. Handle status filters
      if (status) {
        if (['SUCCESS', 'PENDING', 'USER_DROPPED'].includes(status)) {
          query.status = { $in: [status.toLowerCase(), status.toUpperCase()] };
        } else if (status === 'FAILED') {
          query.status = { $in: ['FAILED', 'FAILURE', 'failure'] };
        }
      }

      // 3. Handle payment modes
      if (payment_modes) {
        query.payment_method = { $in: payment_modes };
      }

      // 4. Handle special search filters
      switch (seachFilter) {
        case 'upi_id':
          query.details = { $regex: searchParams };
          break;

        case 'bank_reference':
          query.bank_reference = { $regex: searchParams };
          break;

        case 'order_id':
          query.collect_id = new Types.ObjectId(searchParams);
          break;

        case 'custom_order_id':
          collectRequestLookup.pipeline.push({
            $match: { custom_order_id: searchParams },
          });
          break;

        case 'student_info':
          collectRequestLookup.pipeline.push({
            $match: {
              additional_data: { $regex: searchParams, $options: 'i' },
            },
          });
          break;
      }

      // 5. Add common collect request filters
      collectRequestLookup.pipeline.push({
        $match: {
          trustee_id,
          ...(school_id !== 'null' && { school_id }),
          ...(isQRCode && { isQRPayment: true }),
          ...(gateway && { gateway: { $in: gateway } }),
        },
      });

      // 6. Project only necessary fields
      collectRequestLookup.pipeline.push({
        $project: {
          __v: 0,
          createdAt: 0,
          updatedAt: 0,
          callbackUrl: 0,
          clientId: 0,
          clientSecret: 0,
          webHookUrl: 0,
          disabled_modes: 0,
          amount: 0,
          trustee_id: 0,
          sdkPayment: 0,
          payment_data: 0,
          ccavenue_merchant_id: 0,
          ccavenue_access_code: 0,
          ccavenue_working_key: 0,
          easebuzz_sub_merchant_id: 0,
          paymentIds: 0,
          deepLink: 0,
        },
      });

      // 7. Build main aggregation pipeline
      const aggregationPipeline: any[] = [
        { $match: query },
        { $lookup: collectRequestLookup },
        { $unwind: '$collect_request' },
        {
          $addFields: {
            collect_request: {
              $mergeObjects: [
                '$collect_request',
                {
                  status: '$status',
                  transaction_amount: '$transaction_amount',
                  payment_method: '$payment_method',
                  details: '$details',
                  bank_reference: '$bank_reference',
                  collect_id: '$collect_request._id',
                  order_amount: '$order_amount',
                  merchant_id: '$collect_request.school_id',
                  currency: 'INR',
                  createdAt: '$createdAt',
                  updatedAt: '$updatedAt',
                  transaction_time: '$updatedAt',
                  custom_order_id: '$collect_request.custom_order_id',
                  isSplitPayments: '$collect_request.isSplitPayments',
                  vendors_info: '$collect_request.vendors_info',
                  isAutoRefund: '$isAutoRefund',
                  payment_time: '$payment_time',
                  isQRPayment: '$collect_request.isQRPayment',
                  reason: '$reason',
                  gateway: '$gateway',
                  capture_status: '$capture_status',
                  isVBAPaymentComplete: '$isVBAPaymentComplete',
                },
              ],
            },
          },
        },
        { $replaceRoot: { newRoot: '$collect_request' } },
        { $project: { school_id: 0 } },
      ];

      // 8. Handle pagination
      if (
        !['order_id', 'custom_order_id', 'bank_reference'].includes(
          seachFilter ?? '',
        )
      ) {
        aggregationPipeline.push(
          { $skip: (page - 1) * limit },
          { $limit: Number(limit) },
        );
      }

      // 9. Execute in parallel: data + count
      const [transactions, totalTransactions] = await Promise.all([
        this.databaseService.CollectRequestStatusModel.aggregate(
          aggregationPipeline,
        ),
        this.databaseService.CollectRequestStatusModel.countDocuments(query),
      ]);
      // console.log(transactions, 'transactions');
      console.timeEnd('bulk-transactions-report');
      res.status(201).send({ transactions, totalTransactions });
    } catch (error) {
      console.error('Error in bulkTransactionsCSV:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Post('single-transaction-report')
  async singleTransactionReport(
    @Body()
    body: {
      collect_id: string;
      trustee_id: string;
      token: string;
    },
  ) {
    try {
      const { collect_id, trustee_id, token } = body;
      if (!token) throw new BadRequestException('Token required');
      const decrypted = jwt.verify(token, process.env.KEY!) as {
        trustee_id: string;
        collect_id: string;
      };
      if (decrypted && decrypted?.trustee_id !== trustee_id)
        throw new ForbiddenException('Request forged');
      if (decrypted && decrypted?.collect_id !== collect_id)
        throw new ForbiddenException('Request forged');

      const paymentInfo =
        await this.edvironPgService.getSingleTransactionInfo(collect_id);
      return paymentInfo;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Something went wrong',
      );
    }
  }

  @Get('erp-logo')
  async getErpLogo(@Query('collect_id') collect_id: string) {
    try {
      const collect_request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      const trustee_id = collect_request?.trustee_id;
      const payload = { trustee_id };

      const token = jwt.sign(payload, process.env.KEY!, {
        noTimestamp: true,
      });

      const data = { token };

      const response = await axios({
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/trustee-logo?trustee_id=${trustee_id}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        data: data,
      });

      return response.data;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  @Get('school-id')
  async getSchoolId(@Query('collect_id') collect_id: string) {
    try {
      const collect_request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collect_request) {
        throw new NotFoundException('Collect Request not found');
      }
      return collect_request.school_id;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  // https://payements.edviron.com/edviron-pg/easebuzz/settlement
  @Post('easebuzz/settlement')
  async easebuzzSettlement(@Body() body: any) { }

  // @Get('/payments-info')
  // async getpaymentsInfo(@Query('collect_id') collect_id: string) {
  //   try {
  //     const collectReq =
  //       await this.databaseService.CollectRequestModel.findById(collect_id);
  //     if (!collectReq) {
  //       throw new NotFoundException('Collect Request not found');
  //     }
  //     return {
  //       payments_id: collectReq.paymentIds,
  //       encodedPlatformCharges: collectReq.encodedPlatformCharges,
  //       disabled_modes_string: collectReq.disabled_modes_string,
  //       school_id:collectReq.school_id
  //     };
  //   } catch (e) {
  //     throw new Error(e.message);
  //   }
  // }

  @Get('gatewat-name')
  async getGatewayName(@Req() req: any) {
    try {
      const token = req.query.token;
      let decrypted = jwt.verify(
        token,
        process.env.JWT_SECRET_FOR_TRUSTEE!,
      ) as any;
      const order_id = decrypted.order_id;
      const order = await this.databaseService.CollectRequestModel.findOne({
        _id: order_id,
      });
      if (!order) {
        throw new Error('Invalid Order ID');
      }
      return order.gateway;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('/payments-ratio')
  async getpaymentRatio(
    @Body()
    body: {
      school_id: string;
      mode: string;
      start_date: string;
      token?: string;
    },
  ) {
    const { school_id, mode, start_date } = body;
    try {
      const payments = await this.edvironPgService.getPaymentDetails(
        school_id,
        start_date,
        mode,
      );
      let cashfreeSum = 0;
      let easebuzzSum = 0;
      let razorpaySum = 0;

      for (const payment of payments) {
        const gateway = payment.gateway;
        const amount = payment.transaction_amount;

        if (gateway === Gateway.EDVIRON_PG) {
          cashfreeSum += amount;
        } else if (gateway === Gateway.EDVIRON_EASEBUZZ) {
          easebuzzSum += amount;
        } else if (gateway === Gateway.EDVIRON_RAZORPAY) {
          razorpaySum += amount;
        }
      }

      const totalTransactionAmount = cashfreeSum + easebuzzSum + razorpaySum;
      let percentageCashfree = 0;
      let percentageEasebuzz = 0;
      let percentageRazorpay = 0;
      if (cashfreeSum !== 0) {
        percentageCashfree = parseFloat(
          ((cashfreeSum / totalTransactionAmount) * 100).toFixed(2),
        );
      }
      if (easebuzzSum !== 0) {
        percentageEasebuzz = parseFloat(
          ((easebuzzSum / totalTransactionAmount) * 100).toFixed(2),
        );
      }
      if (razorpaySum !== 0) {
        percentageRazorpay = parseFloat(
          ((razorpaySum / totalTransactionAmount) * 100).toFixed(2),
        );
      }
      console.log({
        cashfreeSum,
        easebuzzSum,
        percentageCashfree,
        percentageEasebuzz,
        percentageRazorpay,
      });

      return {
        cashfreeSum,
        easebuzzSum,
        razorpaySum,
        percentageCashfree,
        percentageEasebuzz,
        percentageRazorpay,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('/pg-status')
  async getPgStatus(@Query('collect_id') collect_id: string) {
    console.log(collect_id);

    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new NotFoundException('Collect Request not found');
    }
    console.log(request, 'req');

    const { paymentIds } = request;
    // if (!paymentIds) {
    //   throw new Error('Payment ids not found');
    // }
    let pgStatus = {
      cashfree: false,
      easebuzz: false,
      razorpay: false,
    };
    if (paymentIds?.cashfree_id) {
      pgStatus.cashfree = true;
    }
    if (paymentIds?.easebuzz_id) {
      pgStatus.easebuzz = true;
    }
    if (request.razorpay && request.razorpay.order_id) {
      pgStatus.razorpay = true;
    }
    return pgStatus;
  }

  @Post('/initiate-refund')
  async initiaterefund(
    @Body()
    body: {
      collect_id: string;
      amount: number;
      refund_id: string;
      token: string;
    },
  ) {
    const { collect_id, amount, refund_id, token } = body;
    let decrypted = jwt.verify(token, process.env.KEY!) as any;
    if (
      collect_id !== decrypted.collect_id ||
      amount !== decrypted.amount ||
      refund_id !== decrypted.refund_id
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new NotFoundException('Collect Request not found');
      }
      const gateway = request.gateway;
      console.log(gateway);

      if (gateway === Gateway.EDVIRON_NTTDATA) {
        const refund = await this.nttDataService.initiateRefund(
          collect_id,
          amount,
          refund_id,
        );
        return refund;
      }

      if (gateway === Gateway.EDVIRON_RAZORPAY) {
        const refund = await this.razorpayNonseamless.refund(
          collect_id,
          amount,
          refund_id,
        );
        return refund;
      }

      if (gateway === Gateway.EDVIRON_WORLDLINE) {
        const refund = await this.worldlineService.initiateRefund(
          collect_id,
          amount,
        );
        return refund;
      }

      if (gateway === Gateway.EDVIRON_PG) {
        console.log('refunding fromcashfree');

        const refunds = await this.cashfreeService.initiateRefund(
          refund_id,
          amount,
          collect_id,
        );
        console.log(refunds);
        const response = {
          collect_id,
          refund_id,
          amount,
        };
        return response;
      }
      if (gateway === Gateway.EDVIRON_EASEBUZZ) {
        console.log('init refund from easebuzz');
        if (request.easebuzz_non_partner) {
          return await this.easebuzzService.initiateRefundv2(
            collect_id,
            amount,
            refund_id,
          );
        }
        const refund = await this.easebuzzService.initiateRefund(
          collect_id,
          amount,
          refund_id,
        );
        console.log(refund);

        return refund;
      }

      if (gateway === Gateway.PAYTM_POS) {
        console.log('init refund from paytm pos');

        const refund = await this.posPaytmService.refund(
          collect_id,
          amount,
          refund_id,
        );

        return refund;
      }
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('/refund-status')
  async getRefundStatus(@Req() req: any) {
    const collect_id = req.query.collect_id;

    return await this.easebuzzService.checkRefundSttaus(collect_id);
  }

  @Get('/sent-mail')
  async sentMail(@Req() req: any) {
    const email = req.query.email;
    const collect_id = req.query.collect_id;
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new NotFoundException('Collect Request not found');
    }
    console.log(request.school_id);

    const schoolInfo = await this.edvironPgService.getSchoolInfo(
      request.school_id,
    );
    console.log(schoolInfo);

    // return await this.edvironPgService.sendTransactionmail(email, request);
  }

  @Post('/terminate')
  async terminate(@Req() req: any) {
    const collect_id = req.query.collect_id;
    return await this.cashfreeService.terminateOrder(collect_id);
  }

  @Get('/get-custom-id')
  async getCustomId(@Query('collect_id') collect_id: string) {
    try {
      const result =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!result) {
        throw new NotFoundException('Collect Request not found');
      }
      if (result.custom_order_id) {
        return result.custom_order_id;
      }
      return 'NA';
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('create-vendor')
  async createVendor(
    @Body()
    body: {
      token: string;
      vendor_info: {
        vendor_id: string;
        status: string;
        name: string;
        email: string;
        phone: string;
        verify_account: string;
        dashboard_access: string;
        schedule_option: number;
        bank: { account_number: string; account_holder: string; ifsc: string };
        kyc_details: {
          account_type: string;
          business_type: string;
          uidai?: string;
          gst?: string;
          cin?: string;
          pan?: string;
          passport_number?: string;
        };
      };
      client_id: string;
    },
  ) {
    console.log('vendor');

    const token = body.token;
    console.log(token);
    const { client_id, vendor_info } = body;
    let decrypted = jwt.verify(token, process.env.KEY!) as any;
    console.log(decrypted);

    if (decrypted.client_id != body.client_id) {
      throw new ForbiddenException('Request forged');
    }
    try {
      return await this.edvironPgService.createVendor(client_id, vendor_info);
    } catch (e) {
      // console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Get('get-vendor-status')
  async checkVendorStatus(@Query('token') token: string) {
    try {
      const decrypted = jwt.verify(token, process.env.KEY!) as {
        vendor_id: string;
        client_id: string;
      };

      if (!decrypted) {
        throw new BadRequestException('Invalid Token');
      }

      if (!decrypted.vendor_id || !decrypted.client_id) {
        throw new BadRequestException('Request Forged');
      }
      return await this.edvironPgService.checkCreatedVendorStatus(
        decrypted.vendor_id,
        decrypted.client_id,
      );
    } catch (error) {
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  @Get('get-vendor-transaction')
  async vendorTransactions(
    @Query('vendor_id') vendor_id: string,
    @Query('trustee_id') trustee_id: string,
    @Query('validate_trustee') validate_trustee: string,
    @Query('school_id') school_id: string,
    @Query('collect_id') collect_id: string,
    @Query('token') token: string,
    @Query('limit') limit: string,
    @Query('page') page: string,
  ) {
    const dataLimit = Number(limit) || 100;
    const dataPage = Number(page) || 1;
    // const decrypted = jwt.verify(token, process.env.KEY!) as any;
    // if (decrypted.validate_trustee !== validate_trustee) {
    //   throw new ForbiddenException('Request forged');
    // }
    let query = {} as any;

    if (vendor_id) {
      query = { vendor_id };
    } else if (school_id) {
      query = { school_id };
    } else if (collect_id) {
      query = { collect_id: new Types.ObjectId(collect_id) };
    } else if (trustee_id) {
      query = { trustee_id };
    } else {
      throw new BadRequestException('Invalid request');
    }

    return await this.edvironPgService.getVendorTransactions(
      query,
      dataLimit,
      dataPage,
    );
  }

  @Post('get-vendor-transaction')
  async getVendorTransactions(
    @Body()
    body: {
      token: string;
      page: number;
      limit: number;
      trustee_id: string;
      status?: string;
      vendor_id?: string;
      school_id?: string[];
      start_date?: string;
      end_date?: string;
      custom_id?: string;
      collect_id?: string;
      gateway?: string[];
      payment_modes?: string[];
    },
  ) {
    console.log('post req');
    try {
      const {
        vendor_id,
        trustee_id,
        school_id,
        collect_id,
        token,
        limit,
        page,
        custom_id,
        start_date,
        end_date,
        status,
        payment_modes,
        gateway,
      } = body;
      const dataLimit = Number(limit) || 100;
      const dataPage = Number(page) || 1;
      const decrypted = jwt.verify(token, process.env.KEY!) as any;
      if (decrypted.validate_trustee !== trustee_id) {
        throw new ForbiddenException('Request forged');
      }
      if (collect_id && !isValidObjectId(collect_id)) {
        throw new BadRequestException('please provide valid edviron order id');
      }
      const query = {
        trustee_id,
        ...(vendor_id && { vendor_id }),
        ...(school_id && { school_id: { $in: school_id } }),
        ...(status && { status: { $regex: new RegExp(`^${status}$`, 'i') } }), // Case-insensitive comparison
        ...(collect_id && { collect_id: new Types.ObjectId(collect_id) }),
        ...(custom_id && { custom_order_id: custom_id }),
        ...(gateway && { gateway: { $in: gateway } }),
        ...(start_date &&
          end_date && {
          updatedAt: {
            $gte: new Date(start_date),
            $lte: new Date(new Date(end_date).setHours(23, 59, 59, 999)),
          },
        }),
      };

      return await this.edvironPgService.getVendorTransactions(
        query,
        dataLimit,
        dataPage,
        payment_modes,
      );
    } catch (error) {
      throw new BadRequestException({
        statusCode: 400,
        message: error.message || 'Something went wrong',
        error: 'Bad Request',
      });
    }
  }

  @Post('/vendors-settlement-recon')
  async vendorSettlementRecon(
    @Body()
    body: {
      trustee_id: string;
      token: string;
      client_id: string;
      start_date: string;
      end_date: string;
      utrNumber: string[];
      cursor?: string;
    },
  ) {
    try {
      const {
        trustee_id,
        client_id,
        token,
        start_date,
        end_date,
        utrNumber,
        cursor,
      } = body;
      console.log('reconnn');

      const decoded = jwt.verify(token, process.env.KEY!) as any;
      // if (decoded.collect_id !== trustee_id) {
      //   throw new UnauthorizedException('Invalid token');
      // }

      console.log(utrNumber, 'uuuu');

      return await this.cashfreeService.vendorSettlementRecon(
        client_id,
        // collectRequest.clientId,
        start_date,
        end_date,
        utrNumber,
        cursor,
      );
    } catch (e) {
      console.log(e);
    }
  }

  @Get('upi-pay-qr')
  async getQRData(@Req() req: any) {
    const { token, collect_id } = req.query;
    // let decrypted = jwt.verify(token, process.env.KEY!) as any;
    // if (decrypted.collect_id != collect_id) {
    //   throw new BadRequestException('Invalid token');
    // }
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new NotFoundException('Collect Request not found');
    }
    if (request.deepLink) {
      return await this.easebuzzService.getQrBase64(collect_id);
    }
    try {
      return await this.cashfreeService.getUpiPaymentInfoUrl(collect_id);
    } catch (e) {
      console.log(e);
    }
  }

  @Get('/get-transaction-report-batched')
  async getTransactionReportBatched(
    @Query('start_date') start_date: string,
    @Query('end_date') end_date: string,
    @Query('trustee_id') trustee_id: string,
    @Query('school_id') school_id: string,
    @Query('status') status: string,
  ) {
    return await this.edvironPgService.getTransactionReportBatched(
      trustee_id,
      start_date,
      end_date,
      status,
      school_id,
    );
  }

  @Post('/get-transaction-report-batched')
  async getTransactionReportBatchedFiltered(
    @Body()
    body: {
      start_date: string;
      end_date: string;
      trustee_id: string;
      status: string;
      school_id?: string | null;
      mode?: string[] | null;
      isQRPayment?: boolean | null;
      gateway?: string[] | null;
    },
  ) {
    const {
      start_date,
      end_date,
      trustee_id,
      school_id,
      mode,
      status,
      isQRPayment,
      gateway,
    } = body;
    console.log('getting transaction sum');

    return await this.edvironPgService.getTransactionReportBatchedFilterd(
      trustee_id,
      start_date,
      end_date,
      status,
      school_id,
      mode,
      isQRPayment,
      gateway,
    );
  }

  @Post('/erp-webhook-logs')
  async getErpWebhookLogs(
    @Body()
    body: {
      token: string;
      limit: number;
      page: number;
      startDate?: string;
      endDate?: string;
      trustee_id: string;
      school_id?: string;
      status?: string;
      collect_id?: string;
      custom_id?: string;
    },
  ) {
    const {
      token,
      startDate,
      endDate,
      limit,
      page,
      trustee_id,
      school_id,
      status,
      collect_id,
      custom_id,
    } = body;
    let query: any = {
      trustee_id,
    };

    if (startDate && endDate) {
      const startOfDayUTC = new Date(
        await this.edvironPgService.convertISTStartToUTC(startDate),
      ); // Start of December 6 in IST
      const endOfDayUTC = new Date(
        await this.edvironPgService.convertISTEndToUTC(endDate),
      );
      query = {
        trustee_id,
        createdAt: {
          $gte: startOfDayUTC,
          $lt: endOfDayUTC,
        },
      };
    }

    if (school_id) {
      query = {
        ...query,
        school_id: school_id,
      };
    }
    if (collect_id) {
      query = {
        ...query,
        collect_id: new Types.ObjectId(collect_id),
      };
    }

    if (custom_id) {
      const request = await this.databaseService.CollectRequestModel.findOne({
        custom_order_id: custom_id,
      });
      if (!request) {
        throw new NotFoundException('Collect Request not found');
      }
      query = {
        ...query,
        collect_id: request._id,
      };
    }
    const totalRecords =
      await this.databaseService.ErpWebhooksLogsModel.countDocuments(query);
    const logs = await this.databaseService.ErpWebhooksLogsModel.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'collectrequests',
          let: { collectId: '$collect_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$collectId'] } } },
            { $project: { custom_order_id: 1, _id: 0 } },
          ],
          as: 'collectReq',
        },
      },
      {
        $addFields: {
          custom_order_id: { $arrayElemAt: ['$collectReq.custom_order_id', 0] },
        },
      },
      {
        $project: {
          collectReq: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    return {
      erp_webhooks_logs: logs,
      totalRecords: totalRecords / limit,
      page,
    };
  }

  @Post('/save-transactions')
  async saveBatchTransactions(
    @Body()
    body: {
      trustee_id: string;
      start_date: string;
      end_date: string;
      status?: string;
    },
  ) {
    const status = body.status || null;
    return await this.edvironPgService.generateBacthTransactions(
      body.trustee_id,
      body.start_date,
      body.end_date,
      status,
    );
  }

  @Post('/save-merchant-transactions')
  async saveMerchantBatchTransactions(
    @Body()
    body: {
      school_id: string;
      start_date: string;
      end_date: string;
      status?: string;
    },
  ) {
    const status = body.status || null;
    return await this.edvironPgService.generateMerchantBacthTransactions(
      body.school_id,
      body.start_date,
      body.end_date,
      status,
    );
  }

  @Get('/get-batch-transactions')
  async getBatchTransactions(
    @Query()
    query: {
      trustee_id: string;
      year: string;
      token: string;
    },
  ) {
    try {
      const { trustee_id, year, token } = query;
      console.log(process.env.KEY);

      const decoded = jwt.verify(token, process.env.KEY!) as any;
      if (decoded.trustee_id !== trustee_id) {
        throw new UnauthorizedException('Invalid token');
      }
      return await this.edvironPgService.getBatchTransactions(
        query.trustee_id,
        query.year,
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('fetch-subtrustee-batch-transactions')
  async getSubtrusteeBatchTransactions(
    @Body() body: { school_ids: string[]; year: string; token: string },
  ) {
    try {
      const { school_ids, year } = body;
      const response =
        await this.edvironPgService.getSubTrusteeBatchTransactions(
          school_ids,
          year,
        );
      return response;
    } catch (e) { }
  }

  @Get('/get-merchant-batch-transactions')
  async getMerchantBatchTransactions(
    @Query()
    query: {
      school_id: string;
      year: string;
      token: string;
    },
  ) {
    try {
      const { school_id, year, token } = query;

      const decoded = jwt.verify(token, process.env.KEY!) as any;
      if (decoded.school_id !== school_id) {
        throw new UnauthorizedException('Invalid token');
      }
      return await this.edvironPgService.getMerchantBatchTransactions(
        query.school_id,
        query.year,
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('/vendor-transactions-settlement')
  async vendorTransactionsSettlement(
    @Body()
    body: {
      collect_id: string;
      token: string;
    },
  ) {
    try {
      const { collect_id, token } = body;
      const decoded = jwt.verify(token, process.env.KEY!) as any;
      if (decoded.collect_id !== collect_id) {
        throw new UnauthorizedException('Invalid token');
      }
      const request = await this.databaseService.CollectRequestModel.findById(
        body.collect_id,
      );
      if (!request) {
        throw new NotFoundException('Collect Request not found');
      }
      const client_id = request.clientId;
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://api.cashfree.com/pg/split/order/vendor/recon`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data: {
          filters: {
            start_date: null,
            end_date: null,
            order_ids: [body.collect_id],
          },
          pagination: {
            limit: 1000,
          },
        },
      };

      const { data } = await axios.request(config);

      return data;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('erp-transaction-info')
  async getErpTransactionInfo(@Req() req: any) {
    const { collect_request_id, token } = req.query;
    try {
      if (!collect_request_id) {
        throw new Error('Collect request id not provided');
      }
      if (!token) throw new Error('Token not provided');
      let decrypted = jwt.verify(token, process.env.KEY!) as any;

      if (decrypted.collect_request_id != collect_request_id) {
        throw new ForbiddenException('Request forged');
      }

      const transactions =
        await this.databaseService.CollectRequestStatusModel.aggregate([
          {
            $match: {
              collect_id: new Types.ObjectId(collect_request_id),
            },
          },
          {
            $lookup: {
              from: 'collectrequests',
              localField: 'collect_id',
              foreignField: '_id',
              as: 'collect_request',
            },
          },
          {
            $unwind: '$collect_request',
          },
          {
            $project: {
              _id: 0,
              __v: 0,
              'collect_request._id': 0,
              'collect_request.__v': 0,
              'collect_request.createdAt': 0,
              'collect_request.updatedAt': 0,
              'collect_request.callbackUrl': 0,
              'collect_request.clientId': 0,
              'collect_request.clientSecret': 0,
              'collect_request.webHookUrl': 0,
              'collect_request.disabled_modes': 0,
              'collect_request.gateway': 0,
              'collect_request.amount': 0,
              'collect_request.trustee_id': 0,
              'collect_request.sdkPayment': 0,
              'collect_request.payment_data': 0,
              'collect_request.ccavenue_merchant_id': 0,
              'collect_request.ccavenue_access_code': 0,
              'collect_request.ccavenue_working_key': 0,
              'collect_request.easebuzz_sub_merchant_id': 0,
              'collect_request.paymentIds': 0,
              'collect_request.deepLink': 0,
            },
          },

          {
            $project: {
              collect_id: 1,
              collect_request: 1,
              status: 1,
              transaction_amount: 1,
              order_amount: 1,
              payment_method: 1,
              details: 1,
              bank_reference: 1,
              createdAt: 1,
              updatedAt: 1,
              isAutoRefund: 1,
              payment_time: 1,
            },
          },
          {
            $addFields: {
              collect_request: {
                $mergeObjects: [
                  '$collect_request',
                  {
                    status: '$status',
                    transaction_amount: '$transaction_amount',
                    payment_method: '$payment_method',
                    details: '$details',
                    bank_reference: '$bank_reference',
                    collect_id: '$collect_id',
                    order_amount: '$order_amount',
                    merchant_id: '$collect_request.school_id',
                    currency: 'INR',
                    createdAt: '$createdAt',
                    updatedAt: '$updatedAt',
                    transaction_time: '$updatedAt',
                    custom_order_id: '$collect_request.custom_order_id',
                    isSplitPayments: '$collect_request.isSplitPayments',
                    vendors_info: '$collect_request.vendors_info',
                    isAutoRefund: '$isAutoRefund',
                    payment_time: '$payment_time',
                  },
                ],
              },
            },
          },
          {
            $replaceRoot: { newRoot: '$collect_request' },
          },
          {
            $sort: { createdAt: -1 },
          },
        ]);

      return transactions;
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  @Post('/payment-capture')
  async mannualCapture(
    @Body()
    body: {
      collect_id: string;
      amount: number;
      capture: string;
      token: string;
    },
  ): Promise<any> {
    try {
      const { collect_id, amount, capture, token } = body;
      const decoded = jwt.verify(token, process.env.KEY!) as any;
      if (decoded.collect_id !== collect_id) {
        throw new UnauthorizedException('Invalid token');
      }
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new BadRequestException('Collect request not found');
      }

      const gateway = collectRequest.gateway;
      if (gateway === Gateway.EDVIRON_PG) {
        return await this.cashfreeService.initiateCapture(
          collectRequest.clientId,
          collect_id,
          capture,
          amount,
        );
      }

      throw new BadRequestException('Capture Not Available');
    } catch (e) {
      if (e.response?.message) {
        // console.log(e.response);
        throw new BadRequestException(e.response.message);
      }
      throw new BadRequestException(e.message);
    }
  }

  @Post('/resolve-disputes')
  async resolveDisputes(
    @Body()
    body: {
      collect_id: string;
      token: string;
      note: string;
      file: string;
      doc_type: string;
      dispute_id: string;
    },
  ) {
    try {
      const { collect_id, token, note, file, doc_type, dispute_id } = body;
      const decoded = jwt.verify(token, process.env.KEY!) as any;
      if (decoded.collect_id !== collect_id) {
        throw new UnauthorizedException('Invalid token');
      }
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new BadRequestException('Collect request not found');
      }

      // if(collectRequest.gateway===Gateway.EDVIRON_PG){
      //   return await this.cashfreeService.resolveDisputeCashfree(
      //     collectRequest.clientId,
      //     collect_id,
      //     dispute_id,
      //     file,
      //     doc_type,
      //     note,
      //   )
      // }
    } catch (e) { }
  }

  @Get('get-order-payment-link')
  async getPaymentsForOrder(@Req() req: any) {
    try {
      const token = req.query.token;
      if (!token) {
        throw new UnauthorizedException('Token not provided');
      }
      const collect_id = req.query.collect_id;
      const decrypted = jwt.verify(token, process.env.KEY!) as any;
      if (decrypted.collect_id !== collect_id) {
        throw new UnauthorizedException('Invalid token');
      }
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new BadRequestException('Invalid Order ID');
      }
      const pgLink = collectRequest.payment_data;
      const cleanedString = pgLink.slice(1, -1);
      return cleanedString;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('/v2/orders')
  async checkStatusV2(
    @Body()
    body: {
      token: string;
      trustee_id: string;
      query: {
        collect_id?: string;
        custom_order_id?: string;
      };
    },
  ) {
    const { token, query, trustee_id } = body;
    try {
      if (query.custom_order_id && query.collect_id) {
        throw new BadRequestException(
          'Please provide either collect_id or custom_order_id',
        );
      }
      if (!query.collect_id && !query.custom_order_id) {
        throw new BadRequestException(
          'Please provide either collect_id or custom_order_id',
        );
      }
      if (!token) {
        throw new UnauthorizedException('Token not provided');
      }
      const decoded = jwt.verify(token, process.env.KEY!) as any;
      if (decoded.trustee_id !== trustee_id) {
        throw new UnauthorizedException('Invalid token');
      }

      const request =
        await this.databaseService.CollectRequestModel.findOne(query);
      if (!request) {
        throw new BadRequestException('Invalid Order ID');
      }
      const status = await this.cashfreeService.getPaymentStatus(
        request._id.toString(),
        request.clientId,
      );
      if (status.length > 0) {
        return {
          status: status[0].payment_status,
          order_amount: status[0].order_amount,
          custom_order_id: request.custom_order_id,
          bank_reference: status[0].bank_reference,
          error_details: status[0].error_details,
          order_id: status[0].order_id,
          payment_completion_time: status[0].payment_completion_time,
          payment_currency: status[0].payment_currency,
          payment_group: status[0].payment_group,
          payment_message: status[0].payment_message,
          payment_method: status[0].payment_method,
          payment_time: status[0].payment_time,
        };
      }
      throw new NotFoundException('Payment Status Not Found');
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('settlement-status')
  async getSettlementStatus(@Req() req: any) {
    const request = await this.databaseService.CollectRequestModel.findById(
      req.query.collect_id,
    );
    if (!request) {
      throw new NotFoundException('Transaction Not Found');
    }
    if (!request) {
      throw new NotFoundException('Transaction Not Found');
    }
    const status = await this.cashfreeService.settlementStatus(
      request._id.toString(),
      request.clientId,
    );

    return status;
  }

  @Post('get-vendor-single-transaction')
  async getVendonrSingleTransactions(
    @Body()
    body: {
      order_id: string;
      trustee_id: string;
      token: string;
    },
  ) {
    const orderId = body.order_id;
    console.log(body.trustee_id);
    if (!orderId) {
      throw new NotFoundException('Client ID is required');
    }

    const decrypted = jwt.verify(body.token, process.env.KEY!) as any;
    if (decrypted.order_id !== orderId) {
      throw new ForbiddenException('Request forged');
    }

    return await this.edvironPgService.getSingleTransaction(orderId);
  }

  @Post('get-Merchantvendor-single-transaction')
  async getMerchantVendonrSingleTransactions(
    @Body()
    body: {
      order_id: string;
      token: string;
    },
  ) {
    const orderId = body.order_id;

    if (!orderId) {
      throw new NotFoundException('Client ID is required');
    }

    const decrypted = jwt.verify(body.token, process.env.KEY!) as any;
    if (decrypted.order_id !== orderId) {
      throw new ForbiddenException('Request forged');
    }

    return await this.edvironPgService.getSingleTransaction(orderId);
  }

  @Post('/update-school-mdr')
  async updateSchoolMdr(
    @Body()
    body: {
      token: string;
      trustee_id: string;
      school_id: string;
      platform_charges: PlatformCharge[];
    },
  ) {
    const { token, trustee_id, school_id, platform_charges } = body;
    try {
      await this.databaseService.PlatformChargeModel.findOneAndUpdate(
        { school_id },
        { $set: { platform_charges } },
        { upsert: true, new: true },
      );

      return { message: 'School MDR updated successfully' };
    } catch (e) {
      console.log(e);

      throw new InternalServerErrorException(e.message);
    }
  }
  @Get('/get-payment-mdr')
  async getPaymentMdr(
    @Query('collect_id') collect_id: string,
    @Query('payment_mode') payment_mode: string,
    @Query('platform_type') platform_type: string,
  ) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new BadRequestException('Invalid collect_id provided');
      }
      const checkAmount = collectRequest.amount;
      const school_id = collectRequest.school_id;
      // Fetch MDR details for the given school_id
      const schoolMdr = await this.databaseService.PlatformChargeModel.findOne({
        school_id,
      }).lean();
      if (!schoolMdr) {
        throw new BadRequestException('School MDR details not found');
      }

      let selectedCharge = schoolMdr.platform_charges.find(
        (charge) =>
          charge.payment_mode.toLocaleLowerCase() ===
          payment_mode.toLocaleLowerCase() &&
          charge.platform_type.toLocaleLowerCase() ===
          platform_type.toLocaleLowerCase(),
      );

      if (!selectedCharge) {
        selectedCharge = schoolMdr.platform_charges.find(
          (charge) =>
            charge.payment_mode.toLowerCase() === 'others' &&
            charge.platform_type.toLowerCase() === platform_type.toLowerCase(),
        );
      }

      if (!selectedCharge) {
        throw new BadRequestException(
          'No MDR found for the given payment mode and platform type',
        );
      }

      const applicableCharges = await this.getApplicableCharge(
        checkAmount,
        selectedCharge.range_charge,
      );
      return {
        range_charge: applicableCharges,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getApplicableCharge(
    amount: number,
    rangeCharge: { charge: number; charge_type: string; upto: number | null }[],
  ) {
    for (let chargeObj of rangeCharge) {
      if (chargeObj.upto === null || amount <= chargeObj.upto) {
        return chargeObj;
      }
    }
    return null;
  }

  @Post('/add-charge')
  async addCharge(
    @Body()
    body: {
      school_id: String;
      platform_type: String;
      payment_mode: String;
      range_charge: rangeCharge[];
    },
  ) {
    const { school_id, platform_type, payment_mode, range_charge } = body;
    const platformCharges =
      await this.databaseService.PlatformChargeModel.findOne({
        school_id,
      });
    if (!platformCharges) {
      throw new Error('Could not find');
    }
    platformCharges.platform_charges.forEach((platformCharge) => {
      if (
        platformCharge.platform_type.toLowerCase() ===
        platform_type.toLowerCase() &&
        platformCharge.payment_mode.toLowerCase() === payment_mode.toLowerCase()
      ) {
        throw new BadRequestException('MDR already present');
      }
    });
  }

  @Get('get-collection-disable-modes')
  async getCollectDisableMode(@Query('collect_id') collect_id: string) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new NotFoundException('Collect Request not found');
      }
      const disableModes = collectRequest.disabled_modes || [];
      return disableModes;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('/get-card-info')
  async getCardInfo(@Query('bin') bin: string) {
    try {
      const data = qs.stringify({
        appId: process.env.CASHFREE_CARD_APP_ID,
        secretKey: process.env.CASHFREE_CARD_SECRET_KEY,
        cardBin: bin,
      });

      const config = {
        method: 'POST',
        url: 'https://api.cashfree.com/api/v1/vault/cards/cardbin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: data,
      };
      const res = await axios.request(config);
      return res.data;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('/vendor-settlement-reconcilation')
  async vendorrecon(
    @Body()
    body: {
      limit: number;
      merchant_vendor_id: string;
      settlement_id: string;
      client_id: string;
      cursor?: string | null;
    },
  ) {
    try {
      const { limit, merchant_vendor_id, client_id, settlement_id, cursor } =
        body;
      const data = {
        pagination: {
          limit,
          cursor: cursor || null,
        },
        filters: {
          settlement_id: Number(settlement_id),
        },
      };

      const config = {
        method: 'post',
        url: 'https://api.cashfree.com/pg/recon/vendor',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data: {
          pagination: {
            limit,
            cursor: cursor || null,
          },
          filters: {
            merchant_vendor_id: merchant_vendor_id,
            settlement_id: Number(settlement_id),
          },
        },
      };

      const { data: response } = await axios.request(config);
      const orderIds = response.data
        .filter(
          (order: any) =>
            order.merchant_order_id !== null &&
            order.merchant_order_id !== 'NA',
        ) // Filter out null merchant_order_id
        .map((order: any) => order.merchant_order_id);
      // return orderIds
      const customOrders = await this.databaseService.CollectRequestModel.find({
        _id: { $in: orderIds },
      });

      const customOrderMap = new Map(
        customOrders.map((doc) => [
          doc._id.toString(),
          {
            custom_order_id: doc.custom_order_id,
            school_id: doc.school_id,
            additional_data: doc.additional_data,
          },
        ]),
      );

      const enrichedOrders = response.data
        .filter(
          (order: any) =>
            order.merchant_order_id && order.merchant_order_id !== 'NA',
        )
        .map((order: any) => {
          let customData: any = {};
          let additionalData: any = {};
          if (order.merchant_order_id && order.merchant_order_id !== 'NA') {
            customData = customOrderMap.get(order.merchant_order_id) || {};
            additionalData = JSON.parse(customData?.additional_data);
          }
          return {
            ...order,
            custom_order_id: customData.custom_order_id || null,
            school_id: customData.school_id || null,
            student_id: additionalData?.student_details?.student_id || null,
            student_name: additionalData.student_details?.student_name || null,
            student_email:
              additionalData.student_details?.student_email || null,
            student_phone_no:
              additionalData.student_details?.student_phone_no || null,
          };
        });
      return {
        cursor: response.cursor,
        limit: response.limit,
        settlements_transactions: enrichedOrders,
      };
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Post('/test-webhook')
  async testWebhook(
    @Body() body: { token: string; url: string; trustee_id: string },
  ) {
    try {
      const { token, url, trustee_id } = body;

      // const decrypted = jwt.verify(token, process.env.KEY!) as any;
      // if (decrypted.trustee_id !== trustee_id) {
      //   throw new ForbiddenException('Request forged');
      // }
      const dummyData = {
        collect_id: '67f616ce02821266c233317f',
        amount: 1,
        status: 'SUCCESS',
        trustee_id: '65d43e124174f07e3e3f8966',
        school_id: '65d443168b8aa46fcb5af3e6',
        req_webhook_urls: [
          'https://webhook.site/481f98b3-83df-49a5-9c7b-b8d024185556',
        ],
        custom_order_id: '',
        createdAt: '2025-04-09T06:42:22.542Z',
        transaction_time: '2025-04-09T06:42:31.000Z',
        additional_data:
          '{"student_details":{"student_id":"s123456","student_email":"testing","student_name":"test name","receipt":"r12"},"additional_fields":{"uid":"11111"}}',
        formattedTransactionDate: '2025-04-09',
        details: '{"upi":{"channel":null,"upi_id":"rajpbarmaiya@axl"}}',
        transaction_amount: 1.02,
        bank_reference: '892748464830',
        payment_method: 'upi',
        payment_details: '{"upi":{"channel":null,"upi_id":"rajpbarmaiya@axl"}}',
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0X2lkIjoiNjdmNjE2Y2UwMjgyMTI2NmMyMzMzMTdlIiwiYW1vdW50IjoxLCJzdGF0dXMiOiJTVUNDRVNTIiwidHJ1c3RlZV9pZCI6IjY1ZDQzZTEyNDE3NGYwN2UzZTNmODk2NyIsInNjaG9vbF9pZCI6IjY1ZDQ0MzE2OGI4YWE0NmZjYjVhZjNlNCIsInJlcV93ZWJob29rX3VybHMiOlsiaHR0cHM6Ly93ZWJob29rLnNpdGUvNDgxZjk4YjMtODNkZi00OWE1LTljN2ItYjhkMDI0MTg1NTU2IiwiZGVmIiwiaHR0cHM6Ly93d3cueWFob28uY29tIiwiaHR0cHM6Ly93d3cuaW5zdGEzNjUuY29tIiwiaHR0cHM6Ly9wYXJ0bmVyLmVkdmlyb24uY29tL2RldiJdLCJjdXN0b21fb3JkZXJfaWQiOiIiLCJjcmVhdGVkQXQiOiIyMDI1LTA0LTA5VDA2OjQyOjIyLjU0MloiLCJ0cmFuc2FjdGlvbl90aW1lIjoiMjAyNS0wNC0wOVQwNjo0MjozMS4wMDBaIiwiYWRkaXRpb25hbF9kYXRhIjoie1wic3R1ZGVudF9kZXRhaWxzXCI6e1wic3R1ZGVudF9pZFwiOlwiczEyMzQ1NlwiLFwic3R1ZGVudF9lbWFpbFwiOlwidGVzdGluZ1wiLFwic3R1ZGVudF9uYW1lXCI6XCJ0ZXN0IG5hbWVcIixcInJlY2VpcHRcIjpcInIxMlwifSxcImFkZGl0aW9uYWxfZmllbGRzXCI6e1widWlkXCI6XCIxMTExMVwifX0iLCJmb3JtYXR0ZWRUcmFuc2FjdGlvbkRhdGUiOiIyMDI1LTA0LTA5IiwiZGV0YWlscyI6IntcInVwaVwiOntcImNoYW5uZWxcIjpudWxsLFwidXBpX2lkXCI6XCJyYWpwYmFybWFpeWFAYXhsXCJ9fSIsInRyYW5zYWN0aW9uX2Ftb3VudCI6MS4wMiwiYmFua19yZWZlcmVuY2UiOiI4OTI3NDg0NjQ4MzAiLCJwYXltZW50X21ldGhvZCI6InVwaSIsInBheW1lbnRfZGV0YWlscyI6IntcInVwaVwiOntcImNoYW5uZWxcIjpudWxsLFwidXBpX2lkXCI6XCJyYWpwYmFybWFpeWFAYXhsXCJ9fSJ9.Bfp9R1oaHYaD6MjCb2frfaEJfh09mJs4GF6xiXSMFXc',
      };

      const webHookData = await sign(dummyData);

      let webhook_key: null | string = null;
      try {
        const token = _jwt.sign(
          { trustee_id: '65d43e124174f07e3e3f8966' },
          process.env.KEY!,
        );
        const config = {
          method: 'get',
          maxBodyLength: Infinity,
          url: `${process.env.VANILLA_SERVICE_ENDPOINT
            }/main-backend/get-webhook-key?token=${token}&trustee_id=${'65d43e124174f07e3e3f8966'}`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
        };
        const { data } = await axios.request(config);

        webhook_key = data?.webhook_key;
      } catch (error) {
        console.error('Error getting webhook key:', error.message);
      }
      let base64Header = '';
      if (webhook_key) {
        base64Header = 'Basic ' + Buffer.from(webhook_key).toString('base64');
      }
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: url,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: base64Header,
        },
        data: webHookData,
      };

      const res = await axios.request(config);
      return res.data;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('/approve-submerchant')
  async approve(
    @Body()
    body: {
      gateway: string;
      school_id: string;
      kyc_mail: string;
      token: string;
    },
  ) {
    try {
      const payload = await this.cashfreeService.getMerchantInfo(
        body.school_id,
        body.kyc_mail,
      );
      const {
        merchant_id,
        merchant_email,
        merchant_name,
        poc_phone,
        merchant_site_url,
        business_details,
        website_details,
        bank_account_details,
        signatory_details,
      } = payload;
      // return payload
      return await this.cashfreeService.createMerchant(
        merchant_id,
        merchant_email,
        merchant_name,
        poc_phone,
        merchant_site_url,
        business_details,
        website_details,
        bank_account_details,
        signatory_details,
      );
    } catch (e) {
      if (e.response?.data) {
        console.log(e.response.data);
        throw new BadRequestException(e.response.data.message);
      }
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Post('/initiate-kyc')
  async initiategatewayKyc(
    @Body() body: { school_id: string; kyc_mail: string; gateway: string },
  ) {
    const { school_id, kyc_mail, gateway } = body;
    try {
      if (gateway === 'CASHFREE') {
        return await this.cashfreeService.initiateMerchantOnboarding(
          school_id,
          kyc_mail,
        );
      }
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Post('school-report-new')
  async genSchoolReport(
    @Body() body: { school_id: string; start_date: string; end_date: string },
  ) {
    const { school_id, start_date, end_date } = body;

    const startOfDayUTC = new Date(
      await this.edvironPgService.convertISTStartToUTC(start_date),
    );
    const endOfDayUTC = new Date(
      await this.edvironPgService.convertISTEndToUTC(end_date),
    );

    try {
      const aggregation =
        await this.databaseService.CollectRequestModel.aggregate([
          {
            $match: {
              school_id,
            },
          },
          {
            $lookup: {
              from: 'collectrequeststatuses',
              localField: '_id',
              foreignField: 'collect_id',
              as: 'result',
            },
          },
          { $unwind: '$result' },
          {
            $match: {
              'result.status': { $in: ['success', 'SUCCESS'] },
              $or: [
                {
                  'result.payment_time': {
                    $ne: null,
                    $gte: startOfDayUTC,
                    $lte: endOfDayUTC,
                  },
                },
                {
                  'result.payment_time': { $eq: null },
                },
                {
                  'result.updatedAt': {
                    $gte: startOfDayUTC,
                    $lte: endOfDayUTC,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              year: { $year: '$result.updatedAt' },
              month: { $month: '$result.updatedAt' },
            },
          },
          {
            $group: {
              _id: { year: '$year', month: '$month' },
              totalTransactions: { $sum: 1 },
              totalVolume: { $sum: '$result.transaction_amount' },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

      const monthlyMap = new Map();
      let yearlyTotalTransactions = 0;
      let yearlyTotalVolume = 0;

      aggregation.forEach((item) => {
        const key = `${item._id.year}-${item._id.month}`;
        monthlyMap.set(key, item);
        yearlyTotalTransactions += item.totalTransactions;
        yearlyTotalVolume += item.totalVolume;
      });

      const start = new Date(start_date);
      const end = new Date(end_date);
      const monthlyReport = [];

      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      while (current <= endMonth) {
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        const key = `${year}-${month}`;

        if (monthlyMap.has(key)) {
          monthlyReport.push(monthlyMap.get(key));
        } else {
          monthlyReport.push({
            _id: { year, month },
            totalTransactions: 0,
            totalVolume: 0,
          });
        }

        current.setMonth(current.getMonth() + 1);
      }

      return {
        yearlyTotal: {
          totalTransactions: yearlyTotalTransactions,
          totalVolume: yearlyTotalVolume,
        },
        monthlyReport,
      };
    } catch (e) {
      console.error('Error generating report:', e.message);
      return { error: 'Failed to generate report' };
    }
  }

  @Post('bulk-transactions-subtrustee-report')
  async bulkSubTrusteeTransactions(
    @Body()
    body: {
      trustee_id: string;
      token: string;
      searchParams?: string;
      isCustomSearch?: boolean;
      seachFilter?: string;
      payment_modes?: string[];
      isQRCode?: boolean;
      gateway?: string[];
      school_ids: Types.ObjectId[];
    },
    @Res() res: any,
    @Req() req: any,
  ) {
    console.time('bulk-transactions-report');
    const {
      trustee_id,
      token,
      searchParams,
      isCustomSearch,
      seachFilter,
      school_ids,
      isQRCode,
      gateway,
    } = body;
    let { payment_modes } = body;
    if (!token) throw new Error('Token not provided');

    if (payment_modes?.includes('upi')) {
      payment_modes = [...payment_modes, 'upi_credit_card']; //debit_card
    }

    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      const status = req.query.status || null;
      // const school_id = req.query.school_id || null;
      // console.log(school_id, 'CHECKING SCHOOL ID');

      const startOfDayUTC = new Date(
        await this.edvironPgService.convertISTStartToUTC(startDate),
      ); // Start of December 6 in IST
      const endOfDayUTC = new Date(
        await this.edvironPgService.convertISTEndToUTC(endDate),
      );
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      // endOfDay.setHours(23, 59, 59, 999);

      const endOfDay = new Date(endDate);
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      endOfDay.setHours(23, 59, 59, 999);

      let collectQuery: any = {
        trustee_id: trustee_id,
        createdAt: {
          $gte: startOfDayUTC,
          $lt: endOfDayUTC,
        },
      };
      if (seachFilter === 'student_info') {
        collectQuery = {
          ...collectQuery,
          additional_data: { $regex: searchParams, $options: 'i' },
        };
      }

      if (school_ids && school_ids.length > 0) {
        collectQuery = {
          ...collectQuery,
          school_id: { $in: school_ids },
        };
      }

      if (isQRCode) {
        collectQuery = {
          ...collectQuery,
          isQRPayment: true,
        };
      }
      if (gateway) {
        collectQuery = {
          ...collectQuery,
          gateway: { $in: gateway },
        };
      }
      let decrypted = jwt.verify(token, process.env.KEY!) as any;
      if (
        JSON.stringify({
          ...JSON.parse(JSON.stringify(decrypted)),
          iat: undefined,
          exp: undefined,
        }) !==
        JSON.stringify({
          trustee_id,
        })
      ) {
        throw new ForbiddenException('Request forged');
      }

      console.log(collectQuery);

      console.time('fetching all transaction');
      const orders =
        await this.databaseService.CollectRequestModel.find(
          collectQuery,
        ).select('_id');

      console.log(orders, 'order');

      let transactions: any[] = [];
      const orderIds = orders.map((order: any) => order._id);
      console.log(orderIds.length);

      console.timeEnd('fetching all transaction');
      let query: any = {
        collect_id: { $in: orderIds },
      };

      if (startDate && endDate) {
        query = {
          ...query,
          $or: [
            {
              payment_time: {
                $ne: null, // Matches documents where payment_time exists and is not null
                $gte: startOfDayUTC,
                $lt: endOfDayUTC,
              },
            },
            {
              $and: [
                { payment_time: { $eq: null } }, // Matches documents where payment_time is null or doesn't exist
                {
                  updatedAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                  },
                },
              ],
            },
          ],
        };
      }

      console.log(`getting transaction`);

      if (
        status === 'SUCCESS' ||
        status === 'PENDING' ||
        status === 'USER_DROPPED'
      ) {
        query = {
          ...query,
          status: { $in: [status.toLowerCase(), status.toUpperCase()] },
        };
      } else if (status === 'FAILED') {
        query = {
          ...query,
          status: { $in: ['FAILED', 'FAILURE', 'failure'] },
        };
      }

      if (payment_modes) {
        query = {
          ...query,
          payment_method: { $in: payment_modes },
        };
      }

      if (seachFilter === 'upi_id') {
        query = {
          ...query,
          details: { $regex: searchParams },
        };
      }

      if (seachFilter === 'bank_reference') {
        const newOrders =
          await this.databaseService.CollectRequestStatusModel.findOne({
            bank_reference: { $regex: searchParams },
          });
        if (!newOrders)
          throw new NotFoundException('No record found for Input');
        const request = await this.databaseService.CollectRequestModel.findOne({
          _id: newOrders.collect_id,
          trustee_id,
        });
        if (!request) {
          throw new NotFoundException('No record found for Input');
        }

        query = {
          collect_id: newOrders.collect_id,
        };
      }
      // const transactionsCount =
      //   await this.databaseService.CollectRequestModel.find({
      //     trustee_id: trustee_id,
      //     createdAt: {
      //       $gte: new Date(startDate),
      //       $lt: endOfDay,
      //     },
      //   }).select('_id');

      console.time('aggregating transaction');
      if (seachFilter === 'order_id' || seachFilter === 'custom_order_id') {
        console.log('Serching custom');
        let searchIfo: any = {};
        let findQuery: any = {
          trustee_id,
        };
        if (school_ids && school_ids.length > 0) {
          findQuery = {
            ...findQuery,
            school_id: { $in: school_ids },
          };
        }
        if (seachFilter === 'order_id') {
          findQuery = {
            ...findQuery,
            _id: new Types.ObjectId(searchParams),
          };

          console.log(findQuery, 'findQuery');

          const checkReq =
            await this.databaseService.CollectRequestModel.findOne(findQuery);
          if (!checkReq)
            throw new NotFoundException('No record found for Input');
          console.log('Serching Order_id');
          searchIfo = {
            collect_id: new Types.ObjectId(searchParams),
          };
        } else if (seachFilter === 'custom_order_id') {
          findQuery = {
            ...findQuery,
            custom_order_id: searchParams,
          };
          console.log('Serching custom_order_id');
          console.log(findQuery, 'findQuery');
          const requestInfo =
            await this.databaseService.CollectRequestModel.findOne(findQuery);
          if (!requestInfo)
            throw new NotFoundException('No record found for Input');
          searchIfo = {
            collect_id: requestInfo._id,
          };
        }
        // else if (seachFilter === 'student_info') {
        //   console.log('Serching student_info');
        //   const studentRegex = {
        //     $regex: searchParams,
        //     $options: 'i',
        //   };
        //   console.log(studentRegex);
        //   console.log(trustee_id, 'trustee');

        //   const requestInfo =
        //     await this.databaseService.CollectRequestModel.find({
        //       trustee_id: trustee_id,
        //       additional_data: { $regex: searchParams, $options: 'i' },
        //     })
        //       .sort({ createdAt: -1 })
        //       .select('_id');
        //   console.log(requestInfo, 'Regex');

        //   if (!requestInfo)
        //     throw new NotFoundException(`No record found for ${searchParams}`);
        //   const requestId = requestInfo.map((order: any) => order._id);
        //   searchIfo = {
        //     collect_id: { $in: requestId },
        //   };
        // }
        // else if (seachFilter === 'bank_reference') {

        //   const requestInfo =
        //     await this.databaseService.CollectRequestStatusModel.findOne({
        //       bank_reference: searchParams,
        //     });
        //   if (!requestInfo)
        //     throw new NotFoundException('No record found for Input');
        //   console.log(requestInfo, 'requestInfo');
        //   searchIfo = {
        //     collect_id:  requestInfo.collect_id,
        //   };
        // } else if (seachFilter === 'upi_id') {

        //   const requestInfo =
        //     await this.databaseService.CollectRequestStatusModel.find({
        //       details: { $regex: `"upi_id":"${searchParams}"`, $options: "i" }
        //     });
        //     console.log(requestInfo, "requestInfo")
        //   if (!requestInfo)
        //     throw new NotFoundException('No record found for Input');
        //     const collectId = requestInfo.map((order: any) => order.collect_id);
        //     console.log(collectId)
        //   searchIfo = {
        //     collect_id: { $in: collectId },
        //   };
        // }

        transactions =
          await this.databaseService.CollectRequestStatusModel.aggregate([
            {
              $match: searchIfo,
            },
            { $sort: { createdAt: -1 } },
            {
              $skip: (page - 1) * limit,
            },

            { $limit: Number(limit) },
            {
              $lookup: {
                from: 'collectrequests',
                localField: 'collect_id',
                foreignField: '_id',
                as: 'collect_request',
              },
            },
            {
              $unwind: '$collect_request',
            },
            {
              $project: {
                _id: 0,
                __v: 0,
                'collect_request._id': 0,
                'collect_request.__v': 0,
                'collect_request.createdAt': 0,
                'collect_request.updatedAt': 0,
                'collect_request.callbackUrl': 0,
                'collect_request.clientId': 0,
                'collect_request.clientSecret': 0,
                'collect_request.webHookUrl': 0,
                'collect_request.disabled_modes': 0,
                // 'collect_request.gateway': 0,
                'collect_request.amount': 0,
                'collect_request.trustee_id': 0,
                'collect_request.sdkPayment': 0,
                'collect_request.payment_data': 0,
                'collect_request.ccavenue_merchant_id': 0,
                'collect_request.ccavenue_access_code': 0,
                'collect_request.ccavenue_working_key': 0,
                'collect_request.easebuzz_sub_merchant_id': 0,
                'collect_request.paymentIds': 0,
                'collect_request.deepLink': 0,
              },
            },
            {
              $project: {
                collect_id: 1,
                collect_request: 1,
                status: 1,
                transaction_amount: 1,
                order_amount: 1,
                payment_method: 1,
                details: 1,
                bank_reference: 1,
                createdAt: 1,
                updatedAt: 1,
                isAutoRefund: 1,
                payment_time: 1,
                reason: 1,
                capture_status: 1,
              },
            },
            {
              $addFields: {
                collect_request: {
                  $mergeObjects: [
                    '$collect_request',
                    {
                      status: '$status',
                      transaction_amount: '$transaction_amount',
                      payment_method: '$payment_method',
                      details: '$details',
                      bank_reference: '$bank_reference',
                      collect_id: '$collect_id',
                      order_amount: '$order_amount',
                      merchant_id: '$collect_request.school_id',
                      currency: 'INR',
                      createdAt: '$createdAt',
                      updatedAt: '$updatedAt',
                      transaction_time: '$updatedAt',
                      custom_order_id: '$collect_request.custom_order_id',
                      isSplitPayments: '$collect_request.isSplitPayments',
                      vendors_info: '$collect_request.vendors_info',
                      isAutoRefund: '$isAutoRefund',
                      payment_time: '$payment_time',
                      isQRPayment: '$collect_request.isQRPayment',
                      reason: '$reason',
                      gateway: '$gateway',
                      capture_status: '$capture_status',
                    },
                  ],
                },
              },
            },
            {
              $replaceRoot: { newRoot: '$collect_request' },
            },
            {
              $project: {
                school_id: 0,
              },
            },
            // {
            //   $sort: { createdAt: -1 },
            // },
          ]);
        // console.log(transactions, 'transactions');
      } else {
        console.log(query, 'else query');
        transactions =
          await this.databaseService.CollectRequestStatusModel.aggregate([
            {
              $match: query,
            },
            { $sort: { createdAt: -1 } },
            {
              $skip: (page - 1) * limit,
            },
            {
              $limit: Number(limit),
            },
            {
              $lookup: {
                from: 'collectrequests',
                localField: 'collect_id',
                foreignField: '_id',
                as: 'collect_request',
              },
            },
            {
              $unwind: '$collect_request',
            },
            {
              $project: {
                _id: 0,
                __v: 0,
                'collect_request._id': 0,
                'collect_request.__v': 0,
                'collect_request.createdAt': 0,
                'collect_request.updatedAt': 0,
                'collect_request.callbackUrl': 0,
                'collect_request.clientId': 0,
                'collect_request.clientSecret': 0,
                'collect_request.webHookUrl': 0,
                'collect_request.disabled_modes': 0,
                // 'collect_request.gateway': 0,
                'collect_request.amount': 0,
                'collect_request.trustee_id': 0,
                'collect_request.sdkPayment': 0,
                'collect_request.payment_data': 0,
                'collect_request.ccavenue_merchant_id': 0,
                'collect_request.ccavenue_access_code': 0,
                'collect_request.ccavenue_working_key': 0,
                'collect_request.easebuzz_sub_merchant_id': 0,
                'collect_request.paymentIds': 0,
                'collect_request.deepLink': 0,
              },
            },
            {
              $project: {
                collect_id: 1,
                collect_request: 1,
                status: 1,
                transaction_amount: 1,
                order_amount: 1,
                payment_method: 1,
                details: 1,
                bank_reference: 1,
                createdAt: 1,
                updatedAt: 1,
                isAutoRefund: 1,
                payment_time: 1,
                reason: 1,
                capture_status: 1,
              },
            },
            {
              $addFields: {
                collect_request: {
                  $mergeObjects: [
                    '$collect_request',
                    {
                      status: '$status',
                      transaction_amount: '$transaction_amount',
                      payment_method: '$payment_method',
                      details: '$details',
                      bank_reference: '$bank_reference',
                      collect_id: '$collect_id',
                      order_amount: '$order_amount',
                      merchant_id: '$collect_request.school_id',
                      currency: 'INR',
                      createdAt: '$createdAt',
                      updatedAt: '$updatedAt',
                      transaction_time: '$updatedAt',
                      custom_order_id: '$collect_request.custom_order_id',
                      isSplitPayments: '$collect_request.isSplitPayments',
                      vendors_info: '$collect_request.vendors_info',
                      isAutoRefund: '$isAutoRefund',
                      payment_time: '$payment_time',
                      reason: '$reason',
                      gateway: '$gateway',
                      capture_status: '$capture_status',
                    },
                  ],
                },
              },
            },
            {
              $replaceRoot: { newRoot: '$collect_request' },
            },
            {
              $project: {
                school_id: 0,
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $skip: page,
            },
            {
              $limit: Number(limit),
            },
          ]);
      }
      console.timeEnd('aggregating transaction');
      console.time('counting');
      const tnxCount =
        await this.databaseService.CollectRequestStatusModel.countDocuments(
          query,
        );
      console.timeEnd('counting');
      console.timeEnd('bulk-transactions-report');
      res.status(201).send({ transactions, totalTransactions: tnxCount });
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('/vba-details')
  async getVba(@Query('collect_id') collect_id: string) {
    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        return {
          isSchoolVBA: false,
          isStudentVBA: false,
          virtual_account_number: '',
          virtual_account_ifsc: '',
          finalAmount: 0,
          beneficiary_bank_and_address: '',
          beneficiary_name: '',
          refrence_no: collect_id,
          transaction_id: collect_id,
          cutomer_name: '',
          cutomer_no: '',
          customer_email: '',
          customer_id: '',
        };
      }
      if (!request.additional_data) {
        return {
          isSchoolVBA: false,
          isStudentVBA: false,
          virtual_account_number: '',
          virtual_account_ifsc: '',
          finalAmount: 0,
          beneficiary_bank_and_address: '',
          beneficiary_name: '',
          refrence_no: collect_id,
          transaction_id: collect_id,
          cutomer_name: '',
          cutomer_no: '',
          customer_email: '',
          customer_id: '',
        };
      }
      const student_info = JSON.parse(request.additional_data);
      const student_id = student_info.student_details?.student_id;
      const vba_account_number = request.vba_account_number;
      if (!vba_account_number) {
        return {
          isSchoolVBA: false,
          isStudentVBA: false,
          virtual_account_number: '',
          virtual_account_ifsc: '',
          finalAmount: 0,
          beneficiary_bank_and_address: '',
          beneficiary_name: '',
          refrence_no: collect_id,
          transaction_id: collect_id,
          cutomer_name: '',
          cutomer_no: '',
          customer_email: '',
          customer_id: '',
        };
      }
      const payload = { vba_account_number: request.vba_account_number };
      const token = jwt.sign(payload, process.env.PAYMENTS_SERVICE_SECRET!, {
        noTimestamp: true,
      });
      const config = {
        method: 'get',
        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/get-student-vba?student_id=${student_id}&token=${token}&vba_account_number=${request.vba_account_number}&amount=${request.amount}&collect_id=${collect_id}&school_id=${request.school_id}`,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const { data: response } = await axios.request(config);
      return response;
    } catch (e) {
      return {
        isSchoolVBA: false,
        isStudentVBA: false,
        virtual_account_number: '',
        virtual_account_ifsc: '',
        finalAmount: 0,
        beneficiary_bank_and_address: '',
        beneficiary_name: '',
        refrence_no: collect_id,
        transaction_id: collect_id,
        cutomer_name: '',
        cutomer_no: '',
        customer_email: '',
        customer_id: '',
      };
    }
  }

  @Get('get-dispute-byOrderId')
  async getDisputesbyOrderId(@Query('collect_id') collect_id: string) {
    try {
      if (!collect_id) {
        throw new BadRequestException('send all details');
      }
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new NotFoundException('Collect Request not found');
      }
      const requestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: request._id,
        });
      if (!requestStatus) {
        throw new NotFoundException('Collect Request not found');
      }

      const client_id = request.clientId;
      const cashfreeConfig = {
        method: 'get',
        url: `https://api.cashfree.com/pg/orders/${request._id}/disputes`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
      };
      const cashfreeResponse = await axios.request(cashfreeConfig);
      return {
        data: {
          cashfreeDispute: cashfreeResponse.data,
          custom_order_id: request.custom_order_id,
          collect_id: collect_id,
          school_id: request.school_id,
          trustee_id: request.trustee_id,
          gateway: request.gateway,
          bank_reference: requestStatus.bank_reference,
          student_detail: request.additional_data,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios Error:', error.response?.data || error.message);
        throw new BadRequestException(
          `External API error: ${error.response?.data?.message || error.message
          }`,
        );
      }
      console.error('Internal Error:', error.message);
      throw new InternalServerErrorException(
        error.message || 'Something went wrong',
      );
    }
  }

  @Post('sendMail-after-transaction')
  async sendMailAfterTransaction(@Body() body: any) {
    const { collect_id } = body;
    try {
      if (!collect_id) {
        throw new BadRequestException('Collect ID is required');
      }
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new NotFoundException('Collect Request not found');
      }
      const getTransactionInfo =
        await this.edvironPgService.getSingleTransactionInfo(collect_id);
      if (!getTransactionInfo) {
        throw new NotFoundException('Transaction not found');
      }
      try {
        const config = {
          url: `${process.env.VANILLA_SERVICE_ENDPOINT}/business-alarm/send-mail-after-transaction`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          data: getTransactionInfo[0],
        };
        const response = await axios.request(config);
      } catch (error) {
        console.error('Error sending email:', error.message);
        throw new BadRequestException('Failed to send email');
      }
      return 'Mail Send Successfully';
    } catch (e) {
      console.error(e);
      throw new BadRequestException(e.message);
    }
  }

  @Post('update-easebuz')
  async updateEasebuzzAmount(@Body() body: any) {
    const {
      key,
      merchant_email,
      start_date,
      end_date,
      submerchant_id,
      school_id,
      salt,
      trustee_id,
    } = body;

    try {
      if (
        !key ||
        !merchant_email ||
        !start_date ||
        !end_date ||
        !school_id ||
        !salt ||
        !trustee_id
      ) {
        throw new BadRequestException('Missing required parameters');
      }

      const hashString = `${key}|${merchant_email}|${start_date}|${end_date}|${salt}`;
      const hashValue = await calculateSHA512Hash(hashString);

      const requestData: any = {
        key,
        hash: hashValue,
        merchant_email,
        date_range: {
          start_date,
          end_date,
        },
        submerchant_id,
      };
      const fetchAndSave = async (requestData: any) => {
        const config = {
          method: 'post',
          url: 'https://dashboard.easebuzz.in/transaction/v2/retrieve/date',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          data: requestData,
        };

        const { data } = await axios.request(config);
        const paymentData = data.data;

        for (const item of paymentData) {
          const response = await this.edvironPgService.retriveEasebuzz(
            item.txnid,
            key,
            salt,
          );
          const data = response.msg[0];
          const studentDetail = {
            student_details: {
              student_id: 'N/A',
              student_email: data.email || 'N/A',
              student_name: data.firstname || 'N/A',
              student_phone_no: data.phone || 'N/A',
              additional_fields: {},
            },
          };
          const collectRequest = new this.databaseService.CollectRequestModel({
            amount: data.amount,
            gateway: Gateway.EDVIRON_EASEBUZZ,
            easebuzz_sub_merchant_id: data.key,
            custom_order_id: data.txnid,
            additional_data: JSON.stringify(studentDetail),
            school_id: school_id,
            trustee_id: trustee_id,
          });
          // await collectRequest.save();

          const mode = data.mode;
          let platform_type = '';
          let payment_method = '';
          let details: any;

          switch (mode) {
            case 'UPI':
              payment_method = 'upi';
              platform_type = 'UPI';
              details = {
                app: {
                  channel: 'NA',
                  upi_id: data.upi_va,
                },
              };
              break;
            case 'DC':
              payment_method = 'debit_card';
              platform_type = 'DeditCard';
              details = {
                card: {
                  card_bank_name: 'NA',
                  card_network: data.network || 'N/A',
                  card_number: data.cardnum,
                  card_type: 'debit_card',
                },
              };
              break;
            case 'CC':
              payment_method = 'crebit_card';
              platform_type = 'CreditCard';
              details = {
                card: {
                  card_bank_name: 'NA',
                  card_network: data.network || 'N/A',
                  card_number: data.cardnum,
                  card_type: 'crebit_card',
                },
              };
              break;
            default:
              details = {};
          }

          const collectRequestStatus =
            new this.databaseService.CollectRequestStatusModel({
              order_amount: data.amount,
              transaction_amount: data.net_amount_debit,
              payment_method: payment_method || data.mode.toLowerCase() || '',
              status: data.status.toUpperCase() || '',
              collect_id: collectRequest._id,
              payment_message: data.payment_message || '',
              payment_time: new Date(data.addedon),
              bank_reference: data.bank_ref_num || '',
              details: JSON.stringify(details),
            });

          // console.log(collectRequestStatus)
          // await collectRequestStatus.save();
        }
        if (data.next) {
          requestData.page = data.next;
          await fetchAndSave(requestData);
        }
        return;
      };
      await fetchAndSave(requestData);
      // return successTransaction;
      return { message: 'All pages fetched and data saved successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('easebuzz-retrive')
  async retriveEasebuzz(@Body() body: any) {
    const { txnid, key } = body;
    const salt = process.env.EASEBUZZ_SALT || '';
    const hashString = `${key}|${txnid}|${salt}`;
    const hashValue = await calculateSHA512Hash(hashString);

    try {
      const requestData: any = {
        txnid,
        key,
        hash: hashValue,
      };
      const config = {
        method: 'post',
        url: 'https://dashboard.easebuzz.in/transaction/v2.1/retrieve',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: requestData,
      };

      const { data } = await axios.request(config);
      console.log(data);
      return data;
    } catch (error) { }
  }

  @Post('set-mdr-zero')
  async setMdrZero(@Body() body: { school_ids: string[] }) {
    try {
      // const reset1=await this.databaseService.PlatformChargeModel.find(
      //   { school_id: { $in: body.school_ids } },
      // )
      const reset = await this.databaseService.PlatformChargeModel.updateMany(
        { school_id: { $in: body.school_ids } },
        { $set: { 'platform_charges.$[].range_charge.$[].charge': 0 } },
      );

      return reset;
    } catch (e) { }
  }

  @Post('sub-trustee-transactions-sum')
  async subTrusteeTransactionsSum(
    @Body()
    body: {
      trustee_id: string;
      school_id: string[];
      gateway?: string[] | null;
      start_date: string;
      end_date: string;
      status: string;
      mode: string[] | null;
      isQRPayment: boolean;
    },
  ) {
    try {
      const {
        trustee_id,
        school_id,
        gateway,
        start_date,
        end_date,
        status,
        mode,
        isQRPayment,
      } = body;
      // console.log({start_date,end_date});

      const response =
        await this.edvironPgService.subtrusteeTransactionAggregation(
          trustee_id,
          start_date,
          end_date,
          school_id,
          status,
          mode,
          isQRPayment,
          gateway,
        );
      return response;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
const y = {
  customer_details: {
    customer_email: null,
    customer_id: '7112AAA812234',
    customer_name: null,
    customer_phone: '9898989898',
  },
  error_details: {
    error_code: 'TRANSACTION_DECLINED',
    error_code_raw: null,
    error_description:
      'Transaction declined due to risk-Amount Less than Minimum Amount configured',
    error_description_raw: null,
    error_reason: 'minimum_amount_limit',
    error_source: 'customer',
  },
  order: {
    order_amount: 4,
    order_currency: 'INR',
    order_id: '68beaff82b235974f1668f4c',
    order_tags: null,
  },
  payment: {
    auth_id: null,
    bank_reference: null,
    cf_payment_id: 4327371039,
    payment_amount: 4.03,
    payment_currency: 'INR',
    payment_group: 'credit_card',
    payment_message:
      'Transaction declined due to risk-Amount Less than Minimum Amount configured',
    payment_method: {
      card: {
        card_bank_name: 'AXIS BANK',
        card_country: 'IN',
        card_network: 'mastercard',
        card_number: 'XXXXXXXXXXXX1978',
        card_sub_type: 'R',
        card_type: 'credit_card',
        channel: null,
      },
    },
    payment_status: 'FAILED',
    payment_time: '2025-09-08T15:59:36+05:30',
  },
  payment_gateway_details: {
    gateway_name: 'CASHFREE',
    gateway_order_id: null,
    gateway_order_reference_id: null,
    gateway_payment_id: null,
    gateway_settlement: null,
    gateway_status_code: null,
  },
  payment_offers: null,
};
