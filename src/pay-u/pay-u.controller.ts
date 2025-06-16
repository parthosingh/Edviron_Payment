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
import { Types } from 'mongoose';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import * as jwt from 'jsonwebtoken';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
@Controller('pay-u')
export class PayUController {
  constructor(
    private readonly payUService: PayUService,
    private readonly databaseService: DatabaseService,
    private readonly edvironPgService: EdvironPgService,
  ) { }
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
      console.log(response.data);
      return response.data;
    } catch (error) {
      throw new Error(`Payment request failed: ${error.message}`);
    }
  }

  @Get('redirect')
  async redirectPayu(@Req() req: any, @Res() res: any) {
    const collect_id = req.query.collect_id;
    const [request, req_status] = await Promise.all([
      this.databaseService.CollectRequestModel.findById(collect_id),
      this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: new Types.ObjectId(collect_id),
      }),
    ]);

    if (!request || !req_status) {
      throw new ConflictException('url fordge');
    }

    if (req_status.status === PaymentStatus.SUCCESS) {
      return res.send(`
        <script>
          alert('This payment has already been completed.');
          window.location.href = '${process.env.URL}/pay-u/callback/?collect_id=${collect_id}';
        </script>
      `);
    }

    if (req_status.status === PaymentStatus.SUCCESS) {
      return res.send(`
        <script>
          alert('This payment has already been completed.');
          window.location.href = '${process.env.URL}/pay-u/callback/?collect_id=${collect_id}';
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
          window.location.href = '${process.env.URL}/pay-u/callback/?collect_id=${collect_id}';
        </script>
      `);
    }
    const { student_details } = JSON.parse(request.additional_data);
    const fullName = student_details.student_name?.trim() || '';

    // Split name into parts
    const nameParts = fullName.split(' ').filter(Boolean);

    const firstName = nameParts[0] || 'NA';
    const lastName =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    const hash = await this.payUService.generate512HASH(
      request.pay_u_key,
      collect_id,
      request.amount,
      request.pay_u_salt,
      firstName,
    );

    res.send(
      `<form action="https://secure.payu.in/_payment" method="post" name="redirect">
        <input type="hidden" name="key" value="${request.pay_u_key}" />
        <input type="hidden" name="txnid" value="${collect_id}" />
        <input type="hidden" name="productinfo" value="school_fee" />
        <input type="hidden" name="amount" value="${request.amount}" />
        <input type="hidden" name="email" value="noreply@edviron.com" />
        <input type="hidden" name="firstname" value=${firstName} />
        <input type="hidden" name="lastname" value=${lastName} />
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
    console.log(req.body);
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
    console.log(req.body);
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
  async handleWebhook(@Body() body: any, @Res() res: any) {
    try {
      const data = JSON.stringify(body);
      console.log(data);

      await new this.databaseService.WebhooksModel({
        body: data,
      }).save();
      const {
        status,
        txnid,
        mode,
        addedon, //transaction time
        field3, // UPI id check for other modes
        field7, //payment message 1
        field8, //payment method (ex QR code) check for other modes,
        field9, //payment message 2
        net_amount_debit, //transaction amount
        bank_ref_no,
        error_Message,
        card_no,
        mihpayid, // payment id for pay-u may used in some APIs
        bankcode,
      } = body;
      const collectIdObject = new Types.ObjectId(txnid);
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(
          collectIdObject,
        );
      if (!collectReq) throw new Error('Collect request not found');
      let transaction_amount = net_amount_debit;
      let payment_method = mode.toLowerCase();
      let payment_message = field7;

      const saveWebhook = await new this.databaseService.WebhooksModel({
        collect_id: collectIdObject,
        body: data,
      }).save();

      const pendingCollectReq =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: collectIdObject,
        });
      // if (
      //   pendingCollectReq &&
      //   (pendingCollectReq.status === PaymentStatus.SUCCESS ||
      //     pendingCollectReq.status === 'success')
      // ) {
      //   res.status(200).send('OK');
      //   return;
      // }
      collectReq.gateway = Gateway.EDVIRON_PAY_U;
      await collectReq.save();

      // Auto refund code start
      try {
        if (
          pendingCollectReq &&
          pendingCollectReq.status === PaymentStatus.FAILED &&
          status.toUpperCase() === 'SUCCESS'
        ) {
          const tokenData = {
            school_id: collectReq?.school_id,
            trustee_id: collectReq?.trustee_id,
          };

          const token = jwt.sign(tokenData, process.env.KEY!, {
            noTimestamp: true,
          });
          console.log('Refunding Duplicate Payment request');
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
              collect_id: txnid,
              school_id: collectReq.school_id,
              trustee_id: collectReq?.trustee_id,
              custom_id: collectReq.custom_order_id || 'NA',
              gateway: Gateway.EDVIRON_PAY_U,
              reason: 'Auto Refund due to dual payment',
            },
          };
          console.time('Refunding Duplicate Payment request');
          const autoRefundResponse = await axios.request(autoRefundConfig);
          console.timeEnd('Refunding Duplicate Payment request');
          collectReq.gateway = Gateway.EDVIRON_PG;
          pendingCollectReq.isAutoRefund = true;
          pendingCollectReq.status = PaymentStatus.FAILED;
          await pendingCollectReq.save();
          await collectReq.save();
          return res.status(200).send('OK');
        }
      } catch (e) {
        console.log(e.message, 'Error in AutoRefund');
        return res.status(400).send('Error in AutoRefund');
      }
      // Above code for Autorefund
      const reqToCheck = await this.payUService.checkStatus(txnid);
      const payment_time = new Date(addedon);
      let platform_type = '';
      let details: any;
      try {
        switch (mode) {
          case 'UPI':
            payment_method = 'upi';
            platform_type = 'UPI';
            details = {
              app: {
                channel: 'NA',
                upi_id: field3,
              },
            };
            break;
          case 'CC':
            payment_method = 'credit_card';
            platform_type = 'CreditCard';
            details = {
              card: {
                card_bank_name: 'NA',
                card_network: bankcode,
                card_number: card_no,
                card_type: 'credit_card',
              },
            };
            break;
          case 'DC':
            payment_method = 'credit_card';
            platform_type = 'CreditCard';
            details = {
              card: {
                card_bank_name: 'NA',
                card_network: bankcode,
                card_number: card_no,
                card_type: 'credit_card',
              },
            };
            break;
        }
      } catch (e) { }

      // Add Commssion for transactions
      if (status.toUpperCase() === 'SUCCESS') {
        try {
          const payment_mode = platform_type;
          const tokenData = {
            school_id: collectReq?.school_id,
            trustee_id: collectReq?.trustee_id,
            order_amount: pendingCollectReq?.order_amount,
            transaction_amount,
            platform_type,
            payment_mode,
            collect_id: collectReq?._id,
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
        } catch (e) {
          console.log(`Error in saving` + e.message);
          // handle commision saved failed and trigger mail to internal team
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
      const custom_order_id = collectReq?.custom_order_id || '';
      const additional_data = collectReq?.additional_data || '';
      const webHookUrl = collectReq?.req_webhook_urls;
      const webHookDataInfo = {
        collect_id: txnid,
        amount: collectReq.amount,
        status,
        trustee_id: collectReq.trustee_id,
        school_id: collectReq.school_id,
        req_webhook_urls: collectReq?.req_webhook_urls,
        custom_order_id,
        createdAt: collectReq?.createdAt,
        transaction_time: payment_time || pendingCollectReq?.updatedAt,
        additional_data,
        details: pendingCollectReq?.details,
        transaction_amount: pendingCollectReq?.transaction_amount,
        bank_reference: pendingCollectReq?.bank_reference,
        payment_method: pendingCollectReq?.payment_method,
        payment_details: pendingCollectReq?.details,
        formattedDate: `${payment_time.getFullYear()}-${String(
          payment_time.getMonth() + 1,
        ).padStart(2, '0')}-${String(payment_time.getDate()).padStart(2, '0')}`,
      };

      if (webHookUrl !== null && webHookUrl.length !== 0) {
        console.log('calling webhook');
        if (collectReq?.trustee_id.toString() === '66505181ca3e97e19f142075') {
          console.log('Webhook called for webschool');
          setTimeout(async () => {
            await this.edvironPgService.sendErpWebhook(
              webHookUrl,
              webHookDataInfo,
            );
          }, 60000);
        } else {
          await this.edvironPgService.sendErpWebhook(
            webHookUrl,
            webHookDataInfo,
          );
        }
      }
      try {
        await this.edvironPgService.sendMailAfterTransaction(collectIdObject.toString());
      } catch (e) {
        await this.databaseService.ErrorLogsModel.create({
          type: 'sendMailAfterTransaction',
          des: collectIdObject.toString(),
          identifier: 'pay u webhook',
          body: e.message || e.toString(),
        });
      }
      return res.status(200).send('OK');
    } catch (error) {
      return res.status(400).send(error.message || 'Error in saving webhook');
    }
  }
}
