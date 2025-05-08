import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NttdataService } from './nttdata.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { Types } from 'mongoose';

@Controller('nttdata')
export class NttdataController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly nttdataService: NttdataService,
  ) {}

  @Get('/redirect')
  async nttdatapayPayment(@Req() req: any, @Res() res: any) {
    try {
      const { collect_id } = req.query;
      const [request, req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);
      if (!request || !req_status)
        throw new NotFoundException('Order not found');
      if (
        !request.ntt_data.nttdata_id ||
        !request.ntt_data.nttdata_secret ||
        !request.ntt_data.ntt_atom_token
      )
        throw new NotFoundException('Order not found');

      if (req_status.status === PaymentStatus.SUCCESS) {
        return res.send(`
        <script>
          alert('This payment has already been completed.');
          window.location.href = '${process.env.URL}/nttdata/callback?collect_id=${collect_id}';
        </script>
      `);
      }

      const created_at = new Date(req_status.createdAt!).getTime();
      const now = Date.now();
      const expiry_duration = 15 * 60 * 1000;

      if (now - created_at > expiry_duration) {
        return res.send(`
        <script>
          alert('The payment session has expired. Please initiate the payment again.');
          window.location.href = '${process.env.URL}/nttdata/callback?collect_id=${collect_id}';
        </script>
      `);
      }

      const additional_data = JSON.parse(request.additional_data);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      let student_email = additional_data?.student_details?.student_email;
      if (!student_email || !emailRegex.test(student_email)) {
        student_email = 'testemail@email.com';
      }
      const student_phone_no =
        additional_data?.student_details?.student_phone_no || '9854684585';

      return res.send(`
            <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8" />
                <title>Payment Page</title>
                <script defer>
                    const cdnScript = document.createElement('script');
                    cdnScript.setAttribute('src', 'https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js?v=' + Date.now());
                    document.head.appendChild(cdnScript);
                    function openPay() {
                    const options = {
                        atomTokenId: "${request.ntt_data.ntt_atom_token}",
                        merchId: "${request?.ntt_data.nttdata_id || ''}",
                        custEmail: "${student_email}",
                        custMobile: "${student_phone_no}",
                        returnUrl: "${
                          process.env.URL
                        }/nttdata/callback?collect_id=${collect_id}"
                    };
                     new AtomPaynetz(options, 'uat');
                    }
                    window.onload = () => {
                    setTimeout(openPay, 1000);
                    };
                </script>
                </head>
                    <body>
                    </body>
            </html>
            `);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('/callback')
  async handleCallback(@Req() req: any, @Res() res: any) {
    try {
      const { collect_id } = req.query;
      const encRes = req.body.encData;

      const [collect_request, collect_req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);
      
      if (!collect_request || !collect_req_status)
        throw new NotFoundException('Order not found');
      const data = JSON.parse(
        this.nttdataService.decrypt(encRes, collect_request.ntt_data.nttdata_hash_res_key, collect_request.ntt_data.nttdata_res_salt)
      );
      collect_request.gateway = Gateway.EDVIRON_NTTDATA;
      collect_request.ntt_data.ntt_atom_txn_id =
        data?.payInstrument?.payDetails?.atomTxnId;
      await collect_request.save();

      const status = await this.nttdataService.getTransactionStatus(collect_id);
      const payment_status = status.status;

      if (payment_status === PaymentStatus.SUCCESS) {
        collect_req_status.status = PaymentStatus.SUCCESS;
        await collect_req_status.save();
      }

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
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  @Get('/callback')
  async handleCallbackGet(@Req() req: any, @Res() res: any) {
    try {
      const { collect_id } = req.query;
      const encRes = req.body.encData;

      const [collect_request, collect_req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);

      if (!collect_request || !collect_req_status)
        throw new NotFoundException('Order not found');

      
      const data = JSON.parse(this.nttdataService.decrypt(encRes, collect_request.ntt_data.nttdata_hash_res_key, collect_request.ntt_data.nttdata_res_salt));

      collect_request.gateway = Gateway.EDVIRON_NTTDATA;
      collect_request.ntt_data.ntt_atom_txn_id =
        data?.payInstrument?.payDetails?.atomTxnId;
      await collect_request.save();

      const status = await this.nttdataService.getTransactionStatus(collect_id);
      const payment_status = status.status;

      if (payment_status === PaymentStatus.SUCCESS) {
        collect_req_status.status = PaymentStatus.SUCCESS;
        await collect_req_status.save();
      }

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
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  @Post('/webhook')
  async handleWebhook(@Req() req: any, @Res() res: any) {
    try {
      const stringified_data = JSON.stringify(req.body);
      await this.databaseService.WebhooksModel.create({
        body: stringified_data,
      });
      return res.sendStatus(200);
    } catch (error) {
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }
}
