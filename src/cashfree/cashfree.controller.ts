import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as jwt from 'jsonwebtoken';
import * as _jwt from 'jsonwebtoken';
import { CashfreeService } from './cashfree.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { generateHMACBase64Type } from 'src/utils/sign';
import { WebhookSource } from 'src/database/schemas/webhooks.schema';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import axios from 'axios';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { platformChange } from 'src/collect/collect.controller';
import { sign } from '../utils/sign';
import { TransactionStatus } from 'src/types/transactionStatus';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';
import { RazorpayService } from 'src/razorpay/razorpay.service';
@Controller('cashfree')
export class CashfreeController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cashfreeService: CashfreeService,
    private readonly edvironPgService: EdvironPgService,
    private readonly easebuzzService: EasebuzzService, 
    private readonly razorpayService: RazorpayService
  ) { }
  @Post('/refund')
  async initiateRefund(@Body() body: any) {
    const { collect_id, amount, refund_id } = body;
    console.log(body);

    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new Error('Collect Request not found');
    }
    const axios = require('axios');
    const data = {
      refund_speed: 'STANDARD',
      refund_amount: amount,
      refund_id: refund_id,
    };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/refunds`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': request.clientId || null,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
      data: data,
    };
    try {
      const response = await axios.request(config);
      console.log(response);

      return response.data;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Post('/split-refund')
  async initiateSplitRefund(
    @Body()
    body: {
      token: string;
      refund_amount: number;
      refund_id: string;
      refund_note: string;
      collect_id: string;
      refund_splits: [
        {
          vendor_id: string;
          amount: number;
          tags: {
            reason: string;
          };
        },
      ];
    },
  ) {
    const {
      token,
      refund_amount,
      refund_note,
      collect_id,
      refund_id,
      refund_splits,
    } = body;
    const data = {
      refund_amount: refund_amount,
      refund_id: refund_id,
      refund_note: refund_note,
      refund_splits,
      refund_speed: 'STANDARD',
    };
    try {
      let decrypted = jwt.verify(token, process.env.KEY!) as any;
      if (decrypted.collect_id != collect_id) {
        throw new BadRequestException('Invalid token');
      }
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new BadRequestException('Collect Request not found');
      }
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/refunds`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': request.clientId || null,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data: data,
      };
      const axios = require('axios');
      const response = await axios.request(config);
      return response.data;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('/upi-payment')
  async getUpiPaymentInfoUrl(@Req() req: any) {
    const { token, collect_id } = req.query;
    let decrypted = jwt.verify(token, process.env.KEY!) as any;
    if (decrypted.collect_id != collect_id) {
      throw new BadRequestException('Invalid token');
    }
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new BadRequestException('Collect Request not found');
    }
    if (request.gateway === Gateway.EXPIRED) {
      throw new BadRequestException('Payment Expired');
    }

    request.gateway = Gateway.EDVIRON_PG;
    await request.save();
    const cashfreeId = request.paymentIds.cashfree_id;

    if (!cashfreeId) {
      try {
        return await this.easebuzzService.getQrBase64(collect_id);
      } catch (e) {
        throw new BadRequestException('Error in Getting QR Code');
      }
    }

    if (
      request.razorpay_seamless &&
      request.razorpay_seamless.order_id &&
      request.razorpay_seamless.razorpay_secret &&
      request.razorpay_seamless.razorpay_id

    ) {
      return await this.razorpayService.getQr(request)
    }
    let intentData = JSON.stringify({
      payment_method: {
        upi: {
          channel: 'link',
        },
      },
      payment_session_id: cashfreeId,
    });

    let qrCodeData = JSON.stringify({
      payment_method: {
        upi: {
          channel: 'qrcode',
        },
      },
      payment_session_id: cashfreeId,
    });
    let upiConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/sessions`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
      },
      data: intentData,
    };

    let qrCodeConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/sessions`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
      },
      data: qrCodeData,
    };

    const axios = require('axios');
    try {
      const { data: upiIntent } = await axios.request(upiConfig);
      const { data: qrCode } = await axios.request(qrCodeConfig);

      const intent = upiIntent.data.payload.default;
      const qrCodeUrl = qrCode.data.payload.qrcode;

      const qrBase64 = qrCodeUrl.split(',')[1];

      request.isQRPayment = true;
      await request.save();

      // terminate order after 10 min
      setTimeout(async () => {
        try {
          await this.cashfreeService.terminateOrder(collect_id);
          console.log(`Order ${collect_id} terminated after 10 minutes`);
        } catch (error) {
          console.error(`Failed to terminate order ${collect_id}:`, error);
        }
      }, 600000);

      return { intentUrl: intent, qrCodeBase64: qrBase64, collect_id };
    } catch (e) {
      console.log(e);
      if (e.response?.data?.message && e.response?.data?.code) {
        if (
          e.response?.data?.message &&
          e.response?.data?.code === 'order_inactive'
        ) {
          throw new BadRequestException('Order expired');
        }
        throw new BadRequestException(e.response.data.message);
      }
      throw new BadRequestException(e.message);
    }
  }

  @Post('/settlements-transactions')
  async getSettlementsTransactions(
    @Body() body: { limit: number; cursor: string | null },
    @Req() req: any,
  ) {
    const { utr, client_id, token } = req.query;
    try {
      const limit = body.limit || 40;
      console.log(limit, 'limit');

      return await this.cashfreeService.getTransactionForSettlements(
        utr,
        client_id,
        limit,
        body.cursor,
      );
    } catch (e) {
      // console.log(e)
      throw new BadRequestException(e.message);
    }
  }

  @Post('/webhook-test')
  async testWebhook(req: any, @Res() res: any) {
    try {
      // const { data } = req.body;
      console.log('test webhook called');

      return res.status(200).json({ message: 'Webhook test successful' });
    } catch (e) {
      console.log(e);
    }
  }
  @Post('/webhook-test-2')
  async testWebhook2(req: any, @Res() res: any) {
    try {
      // const { data } = req.body;
      console.log('test webhook called');

      return res.status(200).json({ message: 'Webhook test successful' });
    } catch (e) {
      console.log(e);
    }
  }

  @Get('/status')
  async checkStatus(@Req() req: any) {
    const collect_id = req.query.collect_id;
    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectReq) {
      throw new BadRequestException('Error while');
    }
    return this.cashfreeService.getPaymentStatus(
      collect_id,
      collectReq.clientId,
    );
  }

  @Post('/update-dispute')
  async disputeEvidence(
    @Body()
    body: {
      dispute_id: string;
      action: string;
      documents: Array<{
        file: string;
        doc_type: string;
        note: string;
      }>;
      client_id: string;
      sign: string;
    },
  ) {
    try {
      const { dispute_id, documents, action, client_id, sign } = body;
      const decodedToken = jwt.verify(sign, process.env.KEY!) as {
        client_id: string;
        dispute_id: string;
        action: string;
      };
      if (!decodedToken) throw new BadRequestException('Request Forged');
      if (
        decodedToken.action !== action ||
        decodedToken.client_id !== client_id ||
        decodedToken.dispute_id !== dispute_id
      )
        throw new BadRequestException('Request Forged');
      if (action === 'deny') {
        return this.cashfreeService.submitDisputeEvidence(
          dispute_id,
          documents,
          client_id,
        );
      } else {
        return this.cashfreeService.acceptDispute(dispute_id, client_id);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Something went wrong',
      );
    }
  }

  @Post('/webhook/secure-test')
  async testSecureWebhook(@Req() req: any, @Res() res: any) {
    const webhook_signature = req.headers['x-webhook-signature'];
    const webhook_timestamp = req.headers['x-webhook-timestamp'];
    const raw_body = JSON.stringify(req.body);
    try {
      const signed_payload = `${webhook_timestamp}${raw_body}`;
      const generated_signature = generateHMACBase64Type(
        signed_payload,
        process.env.CASHFREE_CLIENT_SECRET!,
      );
      if (generated_signature !== webhook_signature) {
        return res.status(400).send('Invalid webhook signature');
      }
      await this.databaseService.WebhooksModel.create({
        body: raw_body,
        webhook_header: {
          source: WebhookSource.Cashfree,
          headers: {
            'x-webhook-signature': webhook_signature,
            'x-webhook-timestamp': webhook_timestamp,
          },
        },
      });
      return res.status(200).json({ message: 'Webhook test successful' });
    } catch (error) {
      const body_data = {
        header: {
          'x-webhook-signature': webhook_signature,
          'x-webhook-timestamp': webhook_timestamp,
        },
        body: raw_body,
      };

      const stringified_body = JSON.stringify(body_data);

      await this.databaseService.ErrorLogsModel.create({
        type: 'Cashfree_Testing',
        body: stringified_body,
        des: error.message,
        identifier: 'Cashfree',
      });
      throw new BadRequestException(error.message);
    }
  }

  @Post('upload-kyc')
  async testUpload(@Body() body: { school_id: string }) {
    try {
      return await this.cashfreeService.uploadKycDocs(body.school_id);
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  @Post('/webhook/vba-transaction')
  async vbaWebhook(@Body() body: any, @Res() res: any) {
    await this.databaseService.WebhooksModel.create({
      body: JSON.stringify(body),
      gateway: 'CASHFREE',
      webhooktype: 'vba',
    });

    const { data } = body;
    const { order, payment, customer_details, payment_gateway_details } = data;

    const {
      payment_status,
      payment_amount,
      payment_message,
      payment_time,
      bank_reference,
      payment_method,
      payment_group,
      cf_payment_id,
    } = payment;

    const {
      utr,
      credit_ref_no,
      remitter_account,
      remitter_name,
      remitter_ifsc,
      email,
      phone,
      vaccount_id, // virtual account id
      vaccount_number, // virtual account number
    } = payment_method.vba_transfer;

    const { customer_name, customer_id, customer_email, customer_phone } =
      customer_details;

    const {
      gateway_name,
      gateway_order_id,
      gateway_payment_id,
      gateway_status_code,
      gateway_order_reference_id,
      gateway_settlement,
    } = payment_gateway_details;

    const request = await this.databaseService.CollectRequestModel.findOne({
      vba_account_number: vaccount_number,
    });
    if (!request) {
      return res.status(200).send('Request Not found');
    }
    request.gateway = Gateway.EDVIRON_PG;
    const collectRequestStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: request._id,
      });
    if (!collectRequestStatus) {
      return res.status(200).send('Request Not found');
    }

    if (payment_status === 'SUCCESS') {
      request.isVBAPaymentComplete = true;
      collectRequestStatus.isVBAPaymentComplete = true;
      await collectRequestStatus.save();
      await request.save();
    }
    collectRequestStatus.transaction_amount = payment_amount;
    collectRequestStatus.payment_method = 'vba';
    collectRequestStatus.status = payment_status;
    collectRequestStatus.details = JSON.stringify(payment_method.vba_transfer);
    collectRequestStatus.bank_reference = bank_reference;
    collectRequestStatus.payment_time = new Date(payment_time);
    collectRequestStatus.payment_message = payment_message;
    if (cf_payment_id) {
      collectRequestStatus.cf_payment_id = cf_payment_id;
    }
    await collectRequestStatus.save();

    // Commision
    try {
      const axios = require('axios');

      const tokenData = {
        school_id: request.school_id,
        trustee_id: request.trustee_id,
        order_amount: collectRequestStatus.order_amount,
        transaction_amount: payment_amount,
        platform_type: 'vba',
        payment_mode: 'Others',
        collect_id: request._id.toString(),
      };

      const _jwt = jwt.sign(tokenData, process.env.KEY!, {
        noTimestamp: true,
      });

      let data = JSON.stringify({
        token: _jwt,
        school_id: request.school_id,
        trustee_id: request.trustee_id,
        order_amount: collectRequestStatus.order_amount,
        transaction_amount: payment_amount,
        platform_type: 'vba',
        payment_mode: 'Others',
        collect_id: request._id,
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
    } catch (e) { }
    const webHookUrl = request.req_webhook_urls;
    const webHookDataInfo = {
      collect_id: request._id.toString(),
      amount: request.amount,
      status: payment_status,
      trustee_id: request.trustee_id,
      school_id: request.school_id,
      req_webhook_urls: request.req_webhook_urls,
      custom_order_id: request.custom_order_id || null,
      createdAt: collectRequestStatus?.createdAt,
      transaction_time: payment_time,
      additional_data: request.additional_data,
      details: collectRequestStatus.details,
      transaction_amount: collectRequestStatus.transaction_amount,
      bank_reference: collectRequestStatus.bank_reference,
      payment_method: collectRequestStatus.payment_method,
      payment_details: collectRequestStatus.details,
      // formattedTransaction_time: transactionTime.toLocaleDateString('en-GB') || null,
      formattedDate: `${collectRequestStatus.payment_time.getFullYear()}-${String(
        collectRequestStatus.payment_time.getMonth() + 1,
      ).padStart(2, '0')}-${String(
        collectRequestStatus.payment_time.getDate(),
      ).padStart(2, '0')}`,
    };

    if (webHookUrl !== null) {
      console.log('calling webhook');
      let webhook_key: null | string = null;
      try {
        const token = jwt.sign(
          { trustee_id: request.trustee_id.toString() },
          process.env.KEY!,
        );
        const config = {
          method: 'get',
          maxBodyLength: Infinity,
          url: `${process.env.VANILLA_SERVICE_ENDPOINT
            }/main-backend/get-webhook-key?token=${token}&trustee_id=${request.trustee_id.toString()}`,
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

      if (request?.trustee_id.toString() === '66505181ca3e97e19f142075') {
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
    res.status(200).send('OK');
  }

  @Post('create-vba')
  async createVBA(
    @Body()
    body: {
      cf_x_client_id: string;
      cf_x_clien_secret: string;
      school_id: string;
      token: string;
      virtual_account_details: {
        virtual_account_id: string;
        virtual_account_name: string;
        virtual_account_email: string;
        virtual_account_phone: string;
      };
      notification_group: string;
    },
  ) {
    const {
      cf_x_clien_secret,
      cf_x_client_id,
      school_id,
      token,
      virtual_account_details,
      notification_group,
    } = body;
    try {
      const decodedToken = (await jwt.verify(token, process.env.KEY!)) as any;
      if (decodedToken.school_id !== school_id) {
        throw new UnauthorizedException('Invalid Token');
      }
      return await this.cashfreeService.createVBA(
        cf_x_client_id,
        cf_x_clien_secret,
        virtual_account_details,
        notification_group,
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('v2/create-vba')
  async createVBAV2(
    @Body()
    body: {
      cf_x_client_id: string;
      cf_x_clien_secret: string;
      school_id: string;
      token: string;
      virtual_account_details: {
        virtual_account_id: string;
        virtual_account_name: string;
        virtual_account_email: string;
        virtual_account_phone: string;
      };
      notification_group: string;
      amount: number;
    },
  ) {
    const {
      cf_x_clien_secret,
      cf_x_client_id,
      school_id,
      token,
      virtual_account_details,
      notification_group,
      amount,
    } = body;
    try {
      const decodedToken = (await jwt.verify(token, process.env.KEY!)) as any;
      if (decodedToken.school_id !== school_id) {
        throw new UnauthorizedException('Invalid Token');
      }
      return await this.cashfreeService.createVBAV2(
        cf_x_client_id,
        cf_x_clien_secret,
        virtual_account_details,
        notification_group,
        amount,
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('/upload-kyc-docs')
  async uploadKYC(@Body() body: { school_id: string }) {
    try {
      return await this.cashfreeService.uploadKycDocs(body.school_id);
    } catch (e) {
      console.log(e);
    }
  }

  @Get('/redirect')
  async redirect(@Query('session_id') session_id: string, @Res() res: any) {
    try {
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
                  paymentSessionId: "${session_id}",
                  redirectTarget: "_self"
              };
              cashfree.checkout(checkoutOptions);
          </script>
      </body>
      </html>
    `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (e) {
      console.error(e);
      throw new BadRequestException(e.message);
    }
  }

  @Post('create-order-v2')
  async createOrderV2(
    @Body()
    body: {
      amount: Number;
      callbackUrl: string;
      jwt: string;
      school_id: string;
      trustee_id: string;
      platform_charges: platformChange[];
      clientId: string;
      clientSecret: string;
      cashfree_credentials: {
        cf_x_client_id: string;
        cf_x_client_secret: string;
        cf_api_key: string;
      };
      webHook?: string;
      disabled_modes?: string[];
      additional_data?: {};
      custom_order_id?: string;
      req_webhook_urls?: string[];
      school_name?: string;
      split_payments?: boolean;
      isVBAPayment: boolean;
      vba_account_number: string;
      vendors_info?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
          scheme_code?: string;
        },
      ];
      vendorgateway?: {
        easebuzz: boolean;
        cashfree: boolean;
      };
      cashfreeVedors?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
        },
      ];
    },
  ) {
    try {
      const {
        amount,
        callbackUrl,
        jwt,
        school_id,
        trustee_id,
        platform_charges,
        clientId,
        clientSecret,
        webHook,
        disabled_modes,
        additional_data,
        custom_order_id,
        req_webhook_urls,
        school_name,
        split_payments,
        isVBAPayment,
        vba_account_number,
        vendors_info,
        vendorgateway,
        cashfreeVedors,
        cashfree_credentials,
      } = body;

      console.log('creating cf order', cashfree_credentials);

      if (!jwt) throw new BadRequestException('JWT not provided');
      if (!amount) throw new BadRequestException('Amount not provided');
      if (!callbackUrl)
        throw new BadRequestException('Callback url not provided');
      let decrypted = _jwt.verify(jwt, process.env.KEY!) as any;

      if (
        Number(decrypted.amount) !== Number(amount) ||
        decrypted.callbackUrl !== callbackUrl
      ) {
        throw new ForbiddenException('Request forged');
      }

      return sign(
        await this.cashfreeService.createOrderV2(
          amount,
          callbackUrl,
          school_id,
          trustee_id,
          disabled_modes,
          platform_charges,
          cashfree_credentials,
          clientId,
          clientSecret,
          webHook,
          additional_data,
          custom_order_id,
          req_webhook_urls,
          school_name,
          split_payments,
          vendors_info,
          vendorgateway,
          cashfreeVedors,
          isVBAPayment,
          vba_account_number,
        ),
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('webhook/v2')
  async handleWebhook(@Body() body: any, @Res() res: any) {
    // Handle the webhook event
    await this.databaseService.WebhooksModel.create({
      gateway: 'CASHFREEV2',
      body: JSON.stringify(body),
    });
    const sample = {
      data: {
        customer_details: {
          customer_email: null,
          customer_id: '7112AAA812234',
          customer_name: null,
          customer_phone: '9898989898',
        },
        order: {
          order_amount: 1,
          order_currency: 'INR',
          order_id: '68a2c4b91e5cd8e23b53bf40',
          order_tags: null,
        },
        payment: {
          auth_id: null,
          bank_reference: '535110682735',
          cf_payment_id: 4257461280,
          payment_amount: 1,
          payment_currency: 'INR',
          payment_group: 'upi',
          payment_message: '00::TRANSACTION HAS BEEN APPROVED',
          payment_method: {
            upi: { channel: null, upi_id: 'rajpbarmaiya@ibl' },
          },
          payment_status: 'SUCCESS',
          payment_time: '2025-08-18T11:44:35+05:30',
        },
        payment_gateway_details: {
          gateway_name: 'CASHFREE',
          gateway_order_id: null,
          gateway_order_reference_id: null,
          gateway_payment_id: null,
          gateway_settlement: 'CASHFREE',
          gateway_status_code: null,
        },
        payment_offers: null,
      },
      event_time: '2025-08-18T11:44:52+05:30',
      merchant: { merchant_id: 'CF_4f4a2b23-dbd0-4345-9970-8f138f1aa2e3' },
      type: 'PAYMENT_SUCCESS_WEBHOOK',
    };

    const SAMPLE2 = {
      data: {
        customer_details: {
          customer_email: null,
          customer_id: '7112AAA812234',
          customer_name: null,
          customer_phone: '9898989898',
        },
        order: {
          order_amount: 1,
          order_currency: 'INR',
          order_id: '68a2ef2a2d63e8144b51124b',
          order_tags: null,
        },
        payment: {
          auth_id: null,
          bank_reference: '780700764068',
          cf_payment_id: 4258181066,
          payment_amount: 1,
          payment_currency: 'INR',
          payment_group: 'upi',
          payment_message: '00::Transaction Success',
          payment_method: { upi: { channel: null, upi_id: '9074296363@ibl' } },
          payment_status: 'SUCCESS',
          payment_time: '2025-08-18T14:45:29+05:30',
        },
        payment_gateway_details: {
          gateway_name: 'CASHFREE',
          gateway_order_id: null,
          gateway_order_reference_id: null,
          gateway_payment_id: null,
          gateway_settlement: 'CASHFREE',
          gateway_status_code: null,
        },
        payment_offers: null,
      },
      event_time: '2025-08-18T14:45:44+05:30',
      merchant: { merchant_id: 'CF_4f4a2b23-dbd0-4345-9970-8f138f1aa2e3' },
      type: 'PAYMENT_SUCCESS_WEBHOOK',
    };
    console.log(body);
    const webhookData = body.data;
    const collect_id = webhookData.order.order_id;

    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectReq) {
      throw new BadRequestException('Invalid Order For Edviron');
    }

    const reqStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectReq._id,
      });

    if (!reqStatus) {
      throw new BadRequestException('Invalid Request Status For Edviron');
    }

    const transaction_amount = webhookData?.payment?.payment_amount || null;
    const payment_method = webhookData?.payment?.payment_group || null;
    const payment_message = webhookData?.payment?.payment_message || 'NA';
    if (reqStatus.status === 'SUCCESS' || reqStatus.status === 'success') {
      console.log('NO PENDING REQUEST');
      res.status(200).json({ message: 'No pending request' });
    }
    const status = webhookData.payment.payment_status;
    const payment_time = new Date(webhookData.payment.payment_time);
    let webhookStatus = status;
    let paymentMode = payment_method;
    let paymentdetails: any = JSON.stringify(
      webhookData.payment.payment_method,
    );
    if (reqStatus?.status === 'FAILED' && webhookStatus === 'USER_DROPPED') {
      webhookStatus = 'FAILED';
      paymentMode = reqStatus.payment_method;
      paymentdetails = reqStatus.details;
    }
    // dont skip Commisions
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
            webhookData.payment.payment_method?.netbanking
              ?.netbanking_bank_name,
          debit_card: webhookData.payment.payment_method?.card?.card_network,
          credit_card: webhookData.payment.payment_method?.card?.card_network,
          upi: 'Others',
          wallet: webhookData.payment.payment_method?.app?.provider,
          cardless_emi:
            webhookData.payment.payment_method?.cardless_emi?.provider,
          pay_later: webhookData.payment?.payment_method?.pay_later?.provider,
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
          order_amount: reqStatus?.order_amount,
          transaction_amount,
          platform_type: mappedPaymentMethod,
          payment_mode: platform_type,
          collect_id: collectReq._id,
        };

        console.log({
          platform_type: mappedPaymentMethod,
          payment_mode: platform_type,
        });

        const _jwt = jwt.sign(tokenData, process.env.KEY!, {
          noTimestamp: true,
        });

        let data = JSON.stringify({
          token: _jwt,
          school_id: collectReq?.school_id,
          trustee_id: collectReq?.trustee_id,
          order_amount: reqStatus?.order_amount,
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
      console.log(e);

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

    const { error_details } = webhookData;
    const updateReq =
      await this.databaseService.CollectRequestStatusModel.updateOne(
        {
          collect_id: collectReq._id,
        },
        {
          $set: {
            status: webhookStatus,
            transaction_amount,
            payment_method: paymentMode,
            details: paymentdetails,
            bank_reference: webhookData.payment.bank_reference,
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

    const collectRequest = collectReq;
    const collectRequestStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectRequest._id,
      });

    if (!collectRequestStatus) {
      throw new Error('Collect Request Not Found');
    }

    const transactionTime = collectRequestStatus.updatedAt;
    if (!transactionTime) {
      throw new Error('Transaction Time Not Found');
    }

    const amount = collectRequest?.amount;
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

    try {
      await this.edvironPgService.sendMailAfterTransaction(
        collectReq._id.toString(),
      );
    } catch (e) {
      await this.databaseService.ErrorLogsModel.create({
        type: 'sendMailAfterTransaction',
        des: collectReq._id.toString(),
        identifier: 'EdvironPg webhook',
        body: e.message || e.toString(),
      });
    }
    res.status(200).send('OK');
  }

  @Get('fix-canteen-transaction')
  async testFix(){
    try{

    }catch(e){
      
    }
  }
}


