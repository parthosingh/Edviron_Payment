import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
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
                    )}";
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

    const paymentString = JSON.parse(collectRequest?.payment_data);
    const parsedUrl = new URL(paymentString);
    const sessionId = parsedUrl.searchParams.get('session_id');
    const params = new URLSearchParams(paymentString);
    const wallet = params.get('wallet');
    const cardless = params.get('cardless');
    const netbanking = params.get('netbanking');

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

    res.send(
      `<script type="text/javascript">
                window.onload = function(){
                    location.href = "${
                      process.env.PG_FRONTEND
                    }?session_id=${sessionId}&collect_request_id=${
                      req.query.collect_id
                    }&amount=${amount}${disable_modes}&platform_charges=${encodeURIComponent(
                      platform_charges,
                    )}&is_blank=${isBlank}";
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

    // split payment to vendors

    if (status == TransactionStatus.SUCCESS) {
      let platform_type: string | null = null;
      const method = payment_method.toLowerCase() as 'net_banking' | 'debit_card' | 'credit_card' | 'upi' | 'wallet' | 'cardless_emi' | 'pay_later';
      
      const platformMap: { [key: string]: any } = {
        net_banking: webHookData.payment.payment_method.netbanking_bank_name,
        debit_card: webHookData.payment.payment_method.card_network,
        credit_card: webHookData.payment.payment_method.card_network,
        upi: 'Others',
        wallet: webHookData.payment.payment_method.provider,
        cardless_emi: webHookData.payment.payment_method.provider,
        pay_later: webHookData.payment.payment_method.provider
      };

      const methodMap: { [key: string]: string } = {
        'net_banking': 'NetBanking',
        'debit_card': 'DebitCard',
        'credit_card': 'CreditCard',
        'upi': 'UPI',
        'wallet': 'Wallet',
        'cardless_emi': 'CardLess EMI',
        'pay_later': 'PayLater'
      };
      
      platform_type = platformMap[method] || 'Others';
      const mappedPaymentMethod = methodMap[method]

      // call the api, send school_id ,trustee_id, payment mode, platform_type

      const axios = require('axios');


      let data = JSON.stringify({
        token: 'your_jwt_token',
        school_id: '60d0fe4f5311236168a109ca',
        trustee_id: '60d0fe4f5311236168a109cb',
        order_amount: 1000,
        transaction_amount: 950,
        mappedPaymentMethod,
        platform_type,
      });

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://yourdomain.com/get-split-calculation',
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
        console.error('Error calculating commission:', error);
      }

      // get vendorIds of trustee and school and cuts
      // call cashfree  split payment api
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

    const webHookUrl = collectReq?.webHookUrl;

    if (webHookUrl !== null) {
      const amount = reqToCheck?.amount;
      const webHookData = await sign({
        collect_id,
        amount,
        status,
        trustee_id: collectReq.trustee_id,
        school_id: collectReq.school_id,
        req_webhook_urls: collectReq?.req_webhook_urls,
      });

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${webHookUrl}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        data: webHookData,
      };
      const webHookSent = await axios.request(config);
      console.log(`webhook sent to ${webHookUrl} with data ${webHookSent}`);
    }
    res.status(200).send('OK');
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
}
