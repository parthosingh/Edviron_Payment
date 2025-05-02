import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  CollectRequest,
  Gateway,
} from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { Transaction } from 'src/types/transaction';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { platformChange } from './collect.controller';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import * as nodemailer from 'nodemailer';
import { HdfcRazorpayService } from 'src/hdfc_razporpay/hdfc_razorpay.service';
import { PayUService } from 'src/pay-u/pay-u.service';
import { SmartgatewayService } from 'src/smartgateway/smartgateway.service';
@Injectable()
export class CollectService {
  constructor(
    private readonly phonepeService: PhonepeService,
    private readonly hdfcService: HdfcService,
    private readonly edvironPgService: EdvironPgService,
    private readonly databaseService: DatabaseService,
    private readonly ccavenueService: CcavenueService,
    private readonly hdfcRazorpay: HdfcRazorpayService,
    private readonly payuService: PayUService,
    private readonly hdfcSmartgatewayService: SmartgatewayService,
  ) {}
  async collect(
    amount: Number,
    callbackUrl: string,
    school_id: string,
    trustee_id: string,
    disabled_modes: string[] = [],
    platform_charges: platformChange[],
    clientId?: string,
    clientSecret?: string,
    webHook?: string,
    additional_data?: {},
    custom_order_id?: string,
    req_webhook_urls?: string[],
    school_name?: string,
    easebuzz_sub_merchant_id?: string,
    ccavenue_merchant_id?: string,
    ccavenue_access_code?: string,
    ccavenue_working_key?: string,
    smartgateway_customer_id?: string | null,
    smartgateway_merchant_id?: string | null,
    smart_gateway_api_key?: string | null,
    splitPayments?: boolean,
    pay_u_key?: string | null,
    pay_u_salt?: string | null,
    hdfc_razorpay_id?: string,
    hdfc_razorpay_secret?: string,
    hdfc_razorpay_mid?: string,
    vendor?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
      },
    ],
  ): Promise<{ url: string; request: CollectRequest }> {
    console.log(req_webhook_urls, 'webhook url');
    console.log(webHook);

    console.log(
      ccavenue_merchant_id,
      'ccavenue',
      ccavenue_access_code,
      ccavenue_working_key,
    );

    if (custom_order_id) {
      const count =
        await this.databaseService.CollectRequestModel.countDocuments({
          school_id,
          custom_order_id,
        });

      if (count > 0) {
        throw new ConflictException('OrderId must be unique');
      }
    }
    console.log('collect request for amount: ' + amount + ' received.', {
      disabled_modes,
    });

    const gateway = clientId === 'edviron' ? Gateway.HDFC : Gateway.PENDING;

    const request = await new this.databaseService.CollectRequestModel({
      amount,
      callbackUrl,
      gateway: gateway,
      clientId,
      clientSecret,
      webHookUrl: webHook || null,
      disabled_modes,
      school_id,
      trustee_id,
      additional_data: JSON.stringify(additional_data),
      custom_order_id,
      req_webhook_urls,
      easebuzz_sub_merchant_id,
      ccavenue_merchant_id: ccavenue_merchant_id || null,
      ccavenue_access_code: ccavenue_access_code || null,
      ccavenue_working_key: ccavenue_working_key || null,
      pay_u_key: pay_u_key || null,
      pay_u_salt: pay_u_salt || null,
    }).save();

    await new this.databaseService.CollectRequestStatusModel({
      collect_id: request._id,
      status: PaymentStatus.PENDING,
      order_amount: request.amount,
      transaction_amount: request.amount,
      payment_method: null,
    }).save();

    if (pay_u_key && pay_u_salt) {
      setTimeout(
        async () => {
          try {
            await this.payuService.terminateOrder(request._id.toString());
          } catch (error) {
            console.log(error.message);
          }
        },
        15 * 60 * 1000,
      );
      return {
        url: `${process.env.URL}/pay-u/redirect?collect_id=${
          request._id
        }&school_name=${school_name?.split(' ').join('_')}`,
        request,
      };
    }

    if (ccavenue_merchant_id) {
      console.log('creating order with CCavenue');
      const transaction = await this.ccavenueService.createOrder(request);
      return { url: transaction.url, request };
    }

    if (hdfc_razorpay_id && hdfc_razorpay_secret && hdfc_razorpay_mid) {
      request.hdfc_razorpay_id = hdfc_razorpay_id;
      request.hdfc_razorpay_secret = hdfc_razorpay_secret;
      request.hdfc_razorpay_mid = hdfc_razorpay_mid;
      request.gateway = Gateway.EDVIRON_HDFC_RAZORPAY;

      await request.save(); // update the existing request

      await new this.databaseService.CollectRequestStatusModel({
        collect_id: request._id,
        status: PaymentStatus.PENDING,
        order_amount: request.amount,
        transaction_amount: request.amount,
        payment_method: null,
      }).save();
      const orderData = await this.hdfcRazorpay.createOrder(request);
      if (orderData.status === 'created') {
        request.hdfc_razorpay_order_id = orderData.id;
        await request.save();
      }
      return {
        url: `${process.env.URL}/hdfc-razorpay/redirect?order_id=${
          orderData.id
        }&collect_id=${request._id}&school_name=${school_name
          ?.split(' ')
          .join('_')}`,
        request,
      };
    }
    if (smartgateway_customer_id && smartgateway_merchant_id && smart_gateway_api_key) {
      request.smartgateway_customer_id = smartgateway_customer_id;
      request.smartgateway_merchant_id = smartgateway_merchant_id;
      request.smart_gateway_api_key = smart_gateway_api_key;
      request.gateway = Gateway.SMART_GATEWAY;
      await request.save();
      const data = await this.hdfcSmartgatewayService.createOrder(
        request,
        smartgateway_customer_id,
        smartgateway_merchant_id,
        smart_gateway_api_key
      );
      console.log(data);
      return { url: data?.url, request: data?.request };
    }

    const transaction = (
      gateway === Gateway.PENDING
        ? await this.edvironPgService.collect(
            request,
            platform_charges,
            school_name,
            splitPayments || false,
            vendor,
          )
        : await this.hdfcService.collect(request)
    )!;
    await this.databaseService.CollectRequestModel.updateOne(
      {
        _id: request._id,
      },
      {
        payment_data: JSON.stringify(transaction.url),
      },
      { new: true },
    );
    return { url: transaction.url, request };
  }

  async sendCallbackEmail(collect_id: string) {
    const htmlToSend = `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
        .container {
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }
        .header {
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }
        .content {
          margin-top: 10px;
          font-size: 16px;
          color: #555;
        }
        .footer {
          margin-top: 20px;
          font-size: 14px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">Order Dropped Notification</div>
        <div class="content">
          <p>The user has dropped the order.</p>
          <p><strong>Order ID:</strong> ${collect_id}</p>
        </div>
        <div class="footer">
          <p>Thank you,</p>
          <p>Your Company Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

    const transporter = nodemailer.createTransport({
      pool: true,
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      },
    });

    const mailOptions = {
      from: 'noreply@edviron.com',
      to: 'rpbarmaiya@gmail.com',
      subject: `Edviron - User Dropped`,
      html: htmlToSend,
    };
    try {
      const info = await transporter.sendMail(mailOptions);

      return 'mail sent successfully';
    } catch (e) {
      console.log(e.message);
    }
  }
}
