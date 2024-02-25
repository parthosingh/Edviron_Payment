import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from './edviron-pg.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { sign } from '../utils/sign';
import axios from 'axios';
import { Webhooks } from 'src/database/schemas/webhooks.schema';
import { Types } from 'mongoose';

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

    console.log(`webhook received with data ${webHookData}`);

    if (!webHookData) throw new Error('Invalid webhook data');

    const collect_id = webHookData.order.order_id;

    if (!Types.ObjectId.isValid(collect_id)) {
      throw new Error('collect_id is not valid');
    }
    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectReq) throw new Error('Collect request not found');

    const saveWebhook = await new this.databaseService.WebhooksModel({
      collect_id,
      body: JSON.stringify(webHookData),
    }).save();

    const pendingCollectReq =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id,
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

    const { status } = reqToCheck;

    const updateReq =
      await this.databaseService.CollectRequestStatusModel.updateOne(
        {
          collect_id: collect_id,
        },
        {
          $set: { status },
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
}
