import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import axios from 'axios';
import * as qs from 'qs';
import { PayUService } from './pay-u.service';
import { DatabaseService } from 'src/database/database.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';

@Controller('pay-u')
export class PayUController {
  constructor(
    private readonly payUService: PayUService,
    private readonly databaseService: DatabaseService,
  ) {}
  @Get('/nb')
  async testPayment() {
    try {
      const url = 'https://test.payu.in/_payment';
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie:
          'ePBfYcIbiJPsAyduYb3rPre11uRvaI7a; PHPSESSID=gdtsmpkbmilsv9beouqc1t10u4',
      };

      const data = qs.stringify({
        key: 'BuxMPz',
        txnid: '123456789',
        amount: '10.00',
        firstname: 'raj',
        email: 'test@gmail.com',
        phone: '9876543210',
        productinfo: 'iPhone',
        pg: 'NB',
        bankcode: 'TESTPGNB',
        surl: 'https://apiplayground-response.herokuapp.com/',
        furl: 'https://apiplayground-response.herokuapp.com/',
        hash: 'fc9d296e94e641ad711817a85dc3eab17b2660d4c411e1e5972131819d81c68411ac50c230f56795d2e393691811a2e17a1c8a39d6d51c050197c0a85b810318',
      });

      const response = await axios.post(url, data, { headers });
      return response.data;
    } catch (error) {
      throw new Error(`Payment request failed: ${error.message}`);
    }
  }

  @Get('redirect')
  async redirectPayu(@Req() req: any, @Res() res: any) {
    const collect_id = req.query.collect_id;
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new ConflictException('url fordge');
    }

    const hash = await this.payUService.generate512HASH(
      request.pay_u_key,
      collect_id,
      request.amount,
      request.pay_u_salt,
    );

    res.send(
      `<form action="https://secure.payu.in/_payment" method="post" name="redirect">
      <input type="hidden" name="key" value="${request.pay_u_key}" />
      <input type="hidden" name="txnid" value="${collect_id}" />
      <input type="hidden" name="productinfo" value="school_fee" />
      <input type="hidden" name="amount" value="${request.amount}" />
      <input type="hidden" name="email" value="noreply@edviron.com" />
      <input type="hidden" name="firstname" value="edviron" />
      <input type="hidden" name="lastname" value="edviron" />
      <input type="hidden" name="surl" value="${process.env.URL}/pay-u/callback/?collect_id=${collect_id}" />
      <input type="hidden" name="furl" value="${process.env.URL}/pay-u/callback/?collect_id=${collect_id}" />
      <input type="hidden" name="phone" value="0000000000" />
      <input type="hidden" name="hash" value="${hash}" />
    </form>
    <script type="text/javascript">
                      window.onload = function(){
                          document.forms['redirect'].submit();
                      }
                  </script>`,
    );
  }

  @Get('/upi')
  async testUpi() {
    try {
      const url = 'https://secure.payu.in/_payment';
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie:
          'ePBfYcIbiJPsAyduYb3rPre11uRvaI7a; PHPSESSID=gdtsmpkbmilsv9beouqc1t10u4',
      };

      const data = qs.stringify({
        key: 'BuxMPz',
        txnid: '123456789',
        amount: '10.00',
        firstname: 'raj',
        email: 'test@gmail.com',
        phone: '9876543210',
        productinfo: 'iPhone',
        pg: 'UPI',
        bankcode: 'UPI',
        vpa: 'kk@okaxis',
        surl: 'https://apiplayground-response.herokuapp.com/',
        furl: 'https://apiplayground-response.herokuapp.com/',
        hash: 'fc9d296e94e641ad711817a85dc3eab17b2660d4c411e1e5972131819d81c68411ac50c230f56795d2e393691811a2e17a1c8a39d6d51c050197c0a85b810318',
      });

      const response = await axios.post(url, data, { headers });
      return response.data;
    } catch (error) {
      throw new Error(`Payment request failed: ${error.message}`);
    }
  }

  @Get('/callback')
  async handleCallback(@Req() req: any, @Res() res: any) {
    const { collect_id } = req.query;
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectRequest) {
      throw new BadRequestException('Error in collect request');
    }
    collectRequest.gateway = Gateway.EDVIRON_PAY_U;
    await collectRequest.save();
    const { status } = await this.payUService.checkStatus(collect_id);

    if (collectRequest?.sdkPayment) {
      if (status === `SUCCESS`) {
        console.log(`SDK payment success for ${collect_id}`);
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`,
        );
      }
      return res.redirect(
        `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`,
      );
    }
    const callbackUrl = new URL(collectRequest.callbackUrl);
    if (status !== `SUCCESS`) {
      return res.redirect(
        `${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
    callbackUrl.searchParams.set('status', 'SUCCESS');
    return res.redirect(callbackUrl.toString());
  }

  @Post('/callback')
  async handleCallbackPost(@Req() req: any, @Res() res: any) {
    const { collect_id } = req.query;
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectRequest) {
      throw new BadRequestException('Error in collect request');
    }
    collectRequest.gateway = Gateway.EDVIRON_PAY_U;
    await collectRequest.save();
    const { status } = await this.payUService.checkStatus(collect_id);

    if (collectRequest?.sdkPayment) {
      if (status === `SUCCESS`) {
        console.log(`SDK payment success for ${collect_id}`);
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`,
        );
      }
      return res.redirect(
        `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`,
      );
    }
    const callbackUrl = new URL(collectRequest.callbackUrl);
    if (status !== `SUCCESS`) {
      return res.redirect(
        `${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
    callbackUrl.searchParams.set('status', 'SUCCESS');
    return res.redirect(callbackUrl.toString());
  }

  @Post('/check-status')
  async checkStatus(@Req() req: any, @Res() res: any) {
    const collect_id = req.query.collect_id;
    const status = await this.payUService.checkStatus(collect_id);
    res.json(status);
  }

  @Post('/webhook')
  async handleWebhook(
    @Body('body') body: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    try {
      const data = JSON.stringify(body);
      await this.databaseService.WebhooksModel.create({ body: data });
      return res.status(200).send('OK');
    } catch (error) {
      return res.status(400).send(error.message || 'Error in saving webhook');
    }
  }
}
