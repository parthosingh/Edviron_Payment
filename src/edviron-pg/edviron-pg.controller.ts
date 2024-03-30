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
                    location.href = "https://pg.edviron.com?session_id=${req.query.session_id}&collect_request_id=${req.query.collect_request_id}&amount=${req.query.amount}${disable_modes}";
                }
            </script>`,
    );
  }

  @Get('/callback')
  async handleCallback(@Req() req: any, @Res() res: any) {
    const { collect_request_id } = req.query;
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      );
    res.redirect(collectRequest?.callbackUrl);
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
      const webHookData = await sign({ collect_id, amount, status });
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
      client_id: string;
      token: string;
    },
    @Res() res: any,
    @Req() req: any,
  ) {
    const { client_id, token } = body;
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
          client_id,
        })
      ) {
        throw new ForbiddenException('Request forged');
      }

      const orders = await this.databaseService.CollectRequestModel.find({
        clientId: client_id,
      }).select('_id');

      if (orders.length == 0) {
        console.log('No orders found for client_id', client_id);
        res.status(200).send('No orders found for clientId');
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

      const transactions =
        await this.databaseService.CollectRequestStatusModel.find(query, null, {
          skip: (page - 1) * limit,
          limit: limit,
        })
          .sort({ createdAt: -1 })
          .select('-_id -__v ');
  
   res.status(201).send({ transactions, totalTransactions: orders.length });
    } catch (error) {
      console.log(error);
      if (error.name === 'JsonWebTokenError')
        throw new UnauthorizedException('JWT invalid');
      throw error;
    }
  }
}
