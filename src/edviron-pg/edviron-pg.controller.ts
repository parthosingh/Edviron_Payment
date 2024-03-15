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
    res.send(
      `<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com?session_id=${req.query.session_id}&collect_request_id=${req.query.collect_request_id}&amount=${req.query.amount}";
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
          $set: { status, transaction_amount, payment_method },
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
  ) {
    const { client_id, token } = body;
    if (!token) throw new Error('Token not provided');

    try {
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
      const transactions =
        await this.databaseService.CollectRequestStatusModel.find({
          collect_id: { $in: orderIds },
        }).select('-_id -__v ');

    
      res.status(201).send(transactions);
    } catch (error) {
      console.log(error);
      if (error.name === 'JsonWebTokenError')
        throw new UnauthorizedException('JWT invalid');
      throw error;
    }
  }
}
