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
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from './edviron-pg.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { sign } from '../utils/sign';
import axios from 'axios';
import { Webhooks } from 'src/database/schemas/webhooks.schema';
import { Types } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { TransactionStatus } from 'src/types/transactionStatus';
import { Gateway } from 'src/database/schemas/collect_request.schema';

@Controller('edviron-pg')
export class EdvironPgController {
  constructor(
    private readonly edvironPgService: EdvironPgService,
    private readonly databaseService: DatabaseService,
  ) {}
  @Get('/redirect')
  async handleRedirect(@Req() req: any, @Res() res: any) {
    const wallet = req.query.wallet;
    const cardless = req.query.cardless;
    const netbanking = req.query.netbanking;
    const pay_later = req.query.pay_later;
    const upi = req.query.upi;
    const card = req.query.card;
    const school_name = req.query.school_name;
    const easebuzz_pg = req.query.easebuzz_pg;
    const payment_id = req.query.payment_id;
    let disable_modes = '';
    if (wallet) disable_modes += `&wallet=${wallet}`;
    if (cardless) disable_modes += `&cardless=${cardless}`;
    if (netbanking) disable_modes += `&netbanking=${netbanking}`;
    if (pay_later) disable_modes += `&pay_later=${pay_later}`;
    if (upi) disable_modes += `&upi=${upi}`;
    if (card) disable_modes += `&card=${card}`;
    res.send(
      `<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com?session_id=${
                      req.query.session_id
                    }&collect_request_id=${
                      req.query.collect_request_id
                    }&amount=${
                      req.query.amount
                    }${disable_modes}&platform_charges=${encodeURIComponent(
                      req.query.platform_charges,
                    )}&school_name=${school_name}&easebuzz_pg=${easebuzz_pg}&payment_id=${payment_id}";
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
                    location.href = "${
                      process.env.PG_FRONTEND
                    }?session_id=${sessionId}&collect_request_id=${
                      req.query.collect_id
                    }&amount=${amount}${disable_modes}&platform_charges=${encodeURIComponent(
                      platform_charges,
                    )}&is_blank=${isBlank}&amount=${amount}&school_name=${
                      info.school_name
                    }&easebuzz_pg=${easebuzz_pg}&payment_id=${payment_id}";
                }
            </script>`,
    );
  }

  @Get('/callback')
  async handleCallback(@Req() req: any, @Res() res: any) {
    const { collect_request_id } = req.query;
    const collectRequest =
      (await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      ))!;

    const info=await this.databaseService.CollectRequestModel.findById(collect_request_id)
    if(!info){
      throw new Error('transaction not found')
    }
    info.gateway=Gateway.EDVIRON_PG
    await info.save()
    const { status } = await this.edvironPgService.checkStatus(
      collect_request_id,
      collectRequest,
    );

    if (collectRequest?.sdkPayment) {
      if (status === `SUCCESS`) {
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
    if (status !== `SUCCESS`) {
      return res.redirect(
        `${callbackUrl.toString()}?EdvironCollectRequestId=${collect_request_id}&status=cancelled&reason=Payment-declined`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
    return res.redirect(callbackUrl.toString());
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
    const reqToCheck = await this.edvironPgService.easebuzzCheckStatus(
      collect_request_id,
      collectRequest,
    );

    const status = reqToCheck.msg.status;

    if (collectRequest?.sdkPayment) {
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
    if (status !== `success`) {
      console.log('failure');
      let reason = reqToCheck?.msg?.error_Message || 'payment-declined';
      if (reason === 'Collect Expired') {
        reason = 'Order Expired';
      }
      return res.redirect(
        `${callbackUrl.toString()}?EdvironCollectRequestId=${collect_request_id}&status=cancelled&reason=${reason}`,
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
    const reqToCheck = await this.edvironPgService.easebuzzCheckStatus(
      collect_request_id,
      collectRequest,
    );

    const status = reqToCheck.msg.status;

    if (collectRequest?.sdkPayment) {
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
    if (status !== `success`) {
      console.log('failure');

      return res.redirect(
        `${callbackUrl.toString()}?EdvironCollectRequestId=${collect_request_id}&status=cancelled&reason=payment-declined`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
    return res.redirect(callbackUrl.toString());
  }

  @Post('/webhook')
  async handleWebhook(@Body() body: any, @Res() res: any) {
    const { data: webHookData } = JSON.parse(JSON.stringify(body));

    console.log('webhook received with data', { body });

    if (!webHookData) throw new Error('Invalid webhook data');

    // console.log('webHookData', webHookData);
    const collect_id = webHookData.order.order_id || body.order.order_id;
    // console.log('collect_id', collect_id);

    if (!Types.ObjectId.isValid(collect_id)) {
      throw new Error('collect_id is not valid');
    }
    const collectIdObject = new Types.ObjectId(collect_id);

    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collectIdObject);
    if (!collectReq) throw new Error('Collect request not found');

    const transaction_amount = webHookData?.payment?.payment_amount || null;
    const payment_method = webHookData?.payment?.payment_group || null;

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
      pendingCollectReq.status !== PaymentStatus.PENDING
    ) {
      console.log('No pending request found for', collect_id);
      res.status(200).send('OK');
      return;
    }

    const reqToCheck = await this.edvironPgService.checkStatus(
      collect_id,
      collectReq,
    );

    //console.log('req', reqToCheck);

    const { status } = reqToCheck;

    // add commision and split payment to vendors

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
          webHookData.payment.payment_method?.netbanking?.netbanking_bank_name,
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

      const _jwt = jwt.sign(tokenData, process.env.KEY!, { noTimestamp: true });

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

        //   // call cashfree split payment api

        //   let easySplitData = JSON.stringify({
        //     split: [
        //       {
        //         vendor_id: commissionRes.trustee_vendor_id,
        //         amount: commissionRes.erpCommission,
        //       },
        //       {
        //         vendor_id: commissionRes.school_vendor_id,
        //         amount: commissionRes.school_fees,
        //       },
        //     ],
        // });

        // let cashfreeConfig = {
        //   method: 'post',
        //   maxBodyLength: Infinity,
        //   url: `${process.env.CASHFREE_ENDPOINT}/pg/easy-split/orders/${collectReq._id}/split`,
        //   headers: {
        //     accept: 'application/json',
        //     'content-type': 'application/json',
        //     'x-api-version': '2023-08-01',
        //     'x-client-id': process.env.CASHFREE_CLIENT_ID,
        //     'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        //   },
        //   data: easySplitData,
        // };
        // try {
        //   const { data: cashfreeRes } = await axios.request(cashfreeConfig);
        //   console.log('Easy Split Response ', cashfreeRes);

        //   let tokenData = {
        //     school_id: collectReq?.school_id,
        //     trustee_id: collectReq?.trustee_id,
        //     commission_amount: commissionRes.erpCommission,
        //     payment_mode: platform_type,
        //     earnings_amount: commissionRes.edvCommission,
        //     transaction_id: collectReq._id,
        //   };

        //   let _jwt = jwt.sign(tokenData, process.env.KEY!, {
        //     noTimestamp: true,
        //   });

        //   let data = JSON.stringify({
        //     token: _jwt,
        //     school_id: collectReq?.school_id,
        //     trustee_id: collectReq?.trustee_id,
        //     commission_amount: commissionRes.erpCommission,
        //     payment_mode: platform_type,
        //     earnings_amount: commissionRes.edvCommission,
        //     transaction_id: collectReq._id,
        //   });

        //   let config = {
        //     method: 'get',
        //     maxBodyLength: Infinity,
        //     url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/get-split-calculation`,
        //     headers: {
        //       accept: 'application/json',
        //       'content-type': 'application/json',
        //       'x-api-version': '2023-08-01',
        //     },
        //     data: data,
        //   };

        //   try {
        //     const { data: addCommisionRes } = await axios.request(config);
        //     console.log('Add Commision Response ', addCommisionRes);
        //   } catch (error) {
        //     console.error('Error adding commision:', error);
        //   }
        // } catch (error) {
        //   console.error('Error spliting payment:', error);
        // }
      } catch (error) {
        console.error('Error calculating commission:', error);
      }
    }

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
            details: JSON.stringify(webHookData.payment.payment_method),
            bank_reference: webHookData.payment.bank_reference,
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
    const custom_order_id = collectRequest?.custom_order_id || '';
    const additional_data = collectRequest?.additional_data || '';
    if (webHookUrl !== null) {
      const amount = reqToCheck?.amount;
      const webHookData = await sign({
        collect_id,
        amount,
        status,
        trustee_id: collectReq.trustee_id,
        school_id: collectReq.school_id,
        req_webhook_urls: collectReq?.req_webhook_urls,
        custom_order_id,
        createdAt: collectRequestStatus?.createdAt,
        transaction_time: collectRequestStatus?.updatedAt,
        additional_data,
      });

      const createConfig = (url: string) => ({
        method: 'post',
        maxBodyLength: Infinity,
        url: url,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        data: webHookData,
      });
      try {
        try {
          const sendWebhook = (url: string) => {
            axios
              .request(createConfig(url))
              .then(() => console.log(`Webhook sent to ${url}`))
              .catch((error) =>
                console.error(
                  `Error sending webhook to ${url}:`,
                  error.message,
                ),
              );
          };

          webHookUrl.forEach(sendWebhook);
        } catch (error) {
          console.error('Error in webhook sending process:', error);
        }
      } catch (error) {
        console.error('Error sending webhooks:', error);
      }
      // const config = {
      //   method: 'post',
      //   maxBodyLength: Infinity,
      //   url: `${webHookUrl}`,
      //   headers: {
      //     accept: 'application/json',
      //     'content-type': 'application/json',
      //   },
      //   data: webHookData,
      // };
      // // const webHookSent = await axios.request(config);
      // console.log(`webhook sent to ${webHookUrl} with data ${webHookSent}`);
    }
    res.status(200).send('OK');
  }

  @Post('/easebuzz/webhook')
  async easebuzzWebhook(@Body() body: any, @Res() res: any) {
    console.log('easebuzz webhook recived with data', body);

    if (!body) throw new Error('Invalid webhook data');
    const collect_id = body.txnid;
    console.log('webhook for ', collect_id);

    if (!Types.ObjectId.isValid(collect_id)) {
      throw new Error('collect_id is not valid');
    }
    const collectIdObject = new Types.ObjectId(collect_id);

    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collectIdObject);
    if (!collectReq) throw new Error('Collect request not found');

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

    // const reqToCheck = await this.easebuzzService.checkStatus(
    //   collectReq,
    //   collect_id,
    // );

    const statusResponse = await this.edvironPgService.easebuzzCheckStatus(
      collect_id,
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
        platform_type = 'UPI';
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
    const custom_order_id = collectRequest?.custom_order_id || '';
    const additional_data = collectRequest?.additional_data || '';
    if (webHookUrl !== null) {
      const amount = reqToCheck?.amount;
      const webHookData = await sign({
        collect_id,
        amount,
        status,
        trustee_id: collectReq.trustee_id,
        school_id: collectReq.school_id,
        req_webhook_urls: collectReq?.req_webhook_urls,
        custom_order_id,
        createdAt: collectRequestStatus?.createdAt,
        transaction_time: collectRequestStatus?.updatedAt,
        additional_data,
      });

      const createConfig = (url: string) => ({
        method: 'post',
        maxBodyLength: Infinity,
        url: url,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        data: webHookData,
      });
      try {
        try {
          const sendWebhook = (url: string) => {
            axios
              .request(createConfig(url))
              .then(() => console.log(`Webhook sent to ${url}`))
              .catch((error) =>
                console.error(
                  `Error sending webhook to ${url}:`,
                  error.message,
                ),
              );
          };

          webHookUrl.forEach(sendWebhook);
        } catch (error) {
          console.error('Error in webhook sending process:', error);
        }
      } catch (error) {
        console.error('Error sending webhooks:', error);
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

      res.status(200).send('OK');
    }
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
          status,
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

  @Get('bulk-transactions-report')
  async bulkTransactions(
    @Body()
    body: {
      trustee_id: string;
      token: string;
    },
    @Res() res: any,
    @Req() req: any,
  ) {
    const { trustee_id, token } = body;
    if (!token) throw new Error('Token not provided');

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
          trustee_id,
        })
      ) {
        throw new ForbiddenException('Request forged');
      }

      const orders = await this.databaseService.CollectRequestModel.find({
        trustee_id: trustee_id,
      }).select('_id');

      let transactions: any[] = [];

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
      console.log(`getting transaction`);

      if (status === 'SUCCESS' || status === 'PENDING') {
        query = {
          ...query,
          status,
        };
      }

      const transactionsCount =
        await this.databaseService.CollectRequestStatusModel.countDocuments(
          query,
        );

      transactions =
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
      throw new Error(error.message);
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
}
