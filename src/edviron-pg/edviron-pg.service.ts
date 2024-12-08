import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectRequest,
  Gateway,
  PaymentIds,
} from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus } from '../types/transactionStatus';
import { platformChange } from 'src/collect/collect.controller';
import { calculateSHA512Hash } from 'src/utils/sign';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as ejs from 'ejs';
import { join } from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as moment from 'moment-timezone';
import { sign } from '../utils/sign';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { CashfreeService } from 'src/cashfree/cashfree.service';
@Injectable()
export class EdvironPgService implements GatewayService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cashfreeService: CashfreeService,
  ) {}
  async collect(
    request: CollectRequest,
    platform_charges: platformChange[],
    school_name: any,
    splitPayments: boolean,
    vendor?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
      },
    ],
  ): Promise<Transaction | undefined> {
    try {
      let paymentInfo: PaymentIds = {
        cashfree_id: null,
        easebuzz_id: null,
        easebuzz_cc_id: null,
        easebuzz_dc_id: null,
        ccavenue_id: null,
        easebuzz_upi_id: null,
      };
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
      const schoolName = school_name.replace(/ /g, '-'); //replace spaces because url dosent support spaces
      const axios = require('axios');
      let data = JSON.stringify({
        customer_details: {
          customer_id: '7112AAA812234',
          customer_phone: '9898989898',
        },
        order_currency: 'INR',
        order_amount: request.amount.toFixed(2),
        order_id: request._id,
        order_meta: {
          return_url:
            process.env.URL +
            '/edviron-pg/callback?collect_request_id=' +
            request._id,
        },
      });
      console.log(splitPayments, 'split pay');

      if (splitPayments && vendor && vendor.length > 0) {
        const vendor_data = vendor.map(({ vendor_id, percentage, amount }) => ({
          vendor_id,
          percentage,
          amount,
        }));
        data = JSON.stringify({
          customer_details: {
            customer_id: '7112AAA812234',
            customer_phone: '9898989898',
          },
          order_currency: 'INR',
          order_amount: request.amount.toFixed(2),
          order_id: request._id,
          order_meta: {
            return_url:
              process.env.URL +
              '/edviron-pg/callback?collect_request_id=' +
              request._id,
          },
          order_splits: vendor_data,
        });

        collectReq.isSplitPayments = true;
        collectReq.vendors_info = vendor;
        await collectReq.save();

        vendor.map(async (info) => {
          const { vendor_id, percentage, amount, name } = info;
          let split_amount = amount;
          if (percentage) {
            split_amount = (request.amount * percentage) / 100;
          }
          await new this.databaseService.VendorTransactionModel({
            vendor_id: vendor_id,
            amount: split_amount,
            collect_id: request._id,
            gateway: Gateway.EDVIRON_PG,
            status: TransactionStatus.PENDING,
            trustee_id: request.trustee_id,
            school_id: request.school_id,
            custom_order_id: request.custom_order_id || '',
            name,
          }).save();
        });
      }

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.CASHFREE_ENDPOINT}/pg/orders`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': request.clientId || null,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data: data,
      };
      let id = '';
      let easebuzz_pg = false;
      if (request.easebuzz_sub_merchant_id) {
        // Easebuzz pg data
        let productinfo = 'payment gateway customer';
        let firstname = 'customer';
        let email = 'noreply@edviron.com';
        let hashData =
          process.env.EASEBUZZ_KEY +
          '|' +
          request._id +
          '|' +
          parseFloat(request.amount.toFixed(2)) +
          '|' +
          productinfo +
          '|' +
          firstname +
          '|' +
          email +
          '|||||||||||' +
          process.env.EASEBUZZ_SALT;

        const easebuzz_cb_surl =
          process.env.URL +
          '/edviron-pg/easebuzz-callback?collect_request_id=' +
          request._id +
          '&status=pass';

        const easebuzz_cb_furl =
          process.env.URL +
          '/edviron-pg/easebuzz-callback?collect_request_id=' +
          request._id +
          '&status=fail';

        let hash = await calculateSHA512Hash(hashData);
        let encodedParams = new URLSearchParams();
        encodedParams.set('key', process.env.EASEBUZZ_KEY!);
        encodedParams.set('txnid', request._id.toString());
        encodedParams.set(
          'amount',
          parseFloat(request.amount.toFixed(2)).toString(),
        );
        // console.log(request.easebuzz_sub_merchant_id, 'sub merchant');

        encodedParams.set('productinfo', productinfo);
        encodedParams.set('firstname', firstname);
        encodedParams.set('phone', '9898989898');
        encodedParams.set('email', email);
        encodedParams.set('surl', easebuzz_cb_surl);
        encodedParams.set('furl', easebuzz_cb_furl);
        encodedParams.set('hash', hash);
        encodedParams.set('request_flow', 'SEAMLESS');
        encodedParams.set('sub_merchant_id', request.easebuzz_sub_merchant_id);
        const options = {
          method: 'POST',
          url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          data: encodedParams,
        };
        const { data: easebuzzRes } = await axios.request(options);
        id = easebuzzRes.data;
        paymentInfo.easebuzz_id = id || null;
        await this.getQr(request._id.toString(), request); // uncomment after fixing easebuzz QR code issue
        easebuzz_pg = true;
        // console.log({ easebuzzRes, _id: request._id });
      }

      let cf_payment_id = '';
      if (request.clientId) {
        const { data: cashfreeRes } = await axios.request(config);
        cf_payment_id = cashfreeRes.payment_session_id;
        paymentInfo.cashfree_id = cf_payment_id || null;
        // setTimeout(
        //   () => {
        //     this.terminateOrder(request._id.toString());
        //   },
        //   20 * 60 * 1000,
        // ); // 20 minutes in milliseconds
      }
      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      const encodedPlatformCharges = encodeURIComponent(
        JSON.stringify(platform_charges),
      );
      collectReq.paymentIds = paymentInfo;
      await collectReq.save();
      return {
        url:
          process.env.URL +
          '/edviron-pg/redirect?session_id=' +
          cf_payment_id +
          '&collect_request_id=' +
          request._id +
          '&amount=' +
          request.amount.toFixed(2) +
          '&' +
          disabled_modes_string +
          '&platform_charges=' +
          encodedPlatformCharges +
          '&school_name=' +
          schoolName +
          '&easebuzz_pg=' +
          easebuzz_pg +
          '&payment_id=' +
          id,
      };
    } catch (err) {
      console.log(err);
      if (err.name === 'AxiosError')
        throw new BadRequestException(
          'Invalid client id or client secret ' +
            JSON.stringify(err.response.data),
        );
      console.log(err);
    }
  }
  async checkStatus(
    collect_request_id: String,
    collect_request: CollectRequest,
  ): Promise<{
    status: TransactionStatus;
    amount: number;
    status_code?: number;
    details?: any;
    custom_order_id?: string;
  }> {
    const axios = require('axios');

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/` + collect_request_id,
      headers: {
        accept: 'application/json',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': collect_request.clientId,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
    };
    try {
      const { data: cashfreeRes } = await axios.request(config);

      // console.log(cashfreeRes, 'cashfree status response');

      const order_status_to_transaction_status_map = {
        ACTIVE: TransactionStatus.FAILURE,
        PAID: TransactionStatus.SUCCESS,
        EXPIRED: TransactionStatus.FAILURE,
        TERMINATED: TransactionStatus.FAILURE,
        TERMINATION_REQUESTED: TransactionStatus.FAILURE,
      };
      console.log(cashfreeRes, 'res');

      const collect_status =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: collect_request_id,
        });
      if (!collect_status) {
        console.log('No status found for custom order id', collect_request_id);
        throw new NotFoundException('No status found for custom order id');
      }
      let transaction_time = '';
      if (
        order_status_to_transaction_status_map[
          cashfreeRes.order_status as keyof typeof order_status_to_transaction_status_map
        ] === TransactionStatus.SUCCESS
      ) {
        transaction_time = collect_status?.updatedAt?.toISOString() as string;
      }
      const checkStatus =
        order_status_to_transaction_status_map[
          cashfreeRes.order_status as keyof typeof order_status_to_transaction_status_map
        ];
      let status_code;
      if (checkStatus === TransactionStatus.SUCCESS) {
        status_code = 200;
      } else {
        status_code = 400;
      }
      const date = new Date(transaction_time);
      const uptDate = moment(date);
      const istDate = uptDate.tz('Asia/Kolkata').format('YYYY-MM-DD');

      return {
        status:
          order_status_to_transaction_status_map[
            cashfreeRes.order_status as keyof typeof order_status_to_transaction_status_map
          ],
        amount: cashfreeRes.order_amount,
        status_code,
        details: {
          bank_ref:
            collect_status?.bank_reference && collect_status?.bank_reference,
          payment_methods:
            collect_status?.details &&
            JSON.parse(collect_status.details as string),
          transaction_time,
          formattedTransactionDate: istDate,
          order_status: cashfreeRes.order_status,
        },
      };
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  async terminateOrder(collect_id: string) {
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new Error('Collect Request not found');
    }

    if (request.gateway !== Gateway.EDVIRON_PG) {
      if (request.gateway === Gateway.PENDING) {
        request.gateway = Gateway.EXPIRED;
        await request.save();
      }
      return true;
    }

    const edvironPgResponse = await this.checkStatus(collect_id, request);
    if (edvironPgResponse.status !== TransactionStatus.PENDING) {
      const collectReqStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: request._id,
        });
      if (collectReqStatus) {
        collectReqStatus.status = PaymentStatus.EXPIRED;
        await collectReqStatus.save();
        try {
          await this.cashfreeService.terminateOrder(collect_id);
        } catch (e) {
          console.log(e.message);
        }
        return true;
      }
    }
    return true;
  }

  async easebuzzCheckStatus(
    collect_request_id: String,
    collect_request: CollectRequest,
  ) {
    const amount = parseFloat(collect_request.amount.toString()).toFixed(1);

    const axios = require('axios');
    let hashData =
      process.env.EASEBUZZ_KEY +
      '|' +
      collect_request_id +
      '|' +
      amount.toString() +
      '|' +
      'noreply@edviron.com' +
      '|' +
      '9898989898' +
      '|' +
      process.env.EASEBUZZ_SALT;

    let hash = await calculateSHA512Hash(hashData);
    const qs = require('qs');

    const data = qs.stringify({
      txnid: collect_request_id,
      key: process.env.EASEBUZZ_KEY,
      amount: amount,
      email: 'noreply@edviron.com',
      phone: '9898989898',
      hash: hash,
    });

    const config = {
      method: 'POST',
      url: `https://dashboard.easebuzz.in/transaction/v1/retrieve`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: data,
    };

    const { data: statusRes } = await axios.request(config);
    console.log(statusRes);
    return statusRes;
  }

  async getPaymentDetails(school_id: string, startDate: string, mode: string) {
    try {
      console.log({ school_id, startDate, mode });
      console.log(mode.toUpperCase());

      const data =
        await this.databaseService.CollectRequestStatusModel.aggregate([
          {
            $match: {
              status: { $in: ['success', 'SUCCESS'] },
              createdAt: { $gte: new Date(startDate) },
              payment_method: {
                $in: [mode.toLocaleLowerCase(), mode.toUpperCase()],
              },
            },
          },
          {
            $lookup: {
              from: 'collectrequests',
              localField: 'collect_id',
              foreignField: '_id',
              as: 'collect_request_data',
            },
          },
          {
            $unwind: '$collect_request_data',
          },
          {
            $match: {
              'collect_request_data.gateway': {
                $in: ['EDVIRON_PG', 'EDVIRON_EASEBUZZ'],
              },
              'collect_request_data.school_id': school_id,
            },
          },
          {
            $project: {
              _id: 0,
              gateway: '$collect_request_data.gateway',
              transaction_amount: 1,
              payment_method: 1,
            },
          },
        ]);
      // console.log(data);

      return data;
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Error fetching payment details');
    }
  }

  async getQr(collect_id: string, request: CollectRequest) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
      const upi_collect_id = `upi_${collect_id}`;
      let productinfo = 'payment gateway customer';
      let firstname = 'customer';
      let email = 'noreply@edviron.com';
      let hashData =
        process.env.EASEBUZZ_KEY +
        '|' +
        upi_collect_id +
        '|' +
        parseFloat(request.amount.toFixed(2)) +
        '|' +
        productinfo +
        '|' +
        firstname +
        '|' +
        email +
        '|||||||||||' +
        process.env.EASEBUZZ_SALT;

      const easebuzz_cb_surl =
        process.env.URL +
        '/edviron-pg/easebuzz-callback?collect_request_id=' +
        upi_collect_id +
        '&status=pass';

      const easebuzz_cb_furl =
        process.env.URL +
        '/edviron-pg/easebuzz-callback?collect_request_id=' +
        upi_collect_id +
        '&status=fail';

      let hash = await calculateSHA512Hash(hashData);
      let encodedParams = new URLSearchParams();
      encodedParams.set('key', process.env.EASEBUZZ_KEY!);
      encodedParams.set('txnid', upi_collect_id);
      encodedParams.set(
        'amount',
        parseFloat(request.amount.toFixed(2)).toString(),
      );
      console.log(request.easebuzz_sub_merchant_id, 'sub merchant');

      encodedParams.set('productinfo', productinfo);
      encodedParams.set('firstname', firstname);
      encodedParams.set('phone', '9898989898');
      encodedParams.set('email', email);
      encodedParams.set('surl', easebuzz_cb_surl);
      encodedParams.set('furl', easebuzz_cb_furl);
      encodedParams.set('hash', hash);
      encodedParams.set('request_flow', 'SEAMLESS');
      encodedParams.set('sub_merchant_id', request.easebuzz_sub_merchant_id);
      const options = {
        method: 'POST',
        url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        data: encodedParams,
      };
      const { data: easebuzzRes } = await axios.request(options);
      const access_key = easebuzzRes.data;
      console.log(access_key, 'access key');
      console.log(collectReq.paymentIds);

      // collectReq.paymentIds.easebuzz_upi_id = access_key;

      // await collectReq.save();
      let formData = new FormData();
      formData.append('access_key', access_key);
      formData.append('payment_mode', `UPI`);
      formData.append('upi_qr', 'true');
      formData.append('request_mode', 'SUVA');

      let config = {
        method: 'POST',
        url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/initiate_seamless_payment/`,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        data: formData,
      };

      const response = await axios.request(config);
      console.log(response.data, 'res in qr code');

      await this.databaseService.CollectRequestModel.findByIdAndUpdate(
        collect_id,
        {
          deepLink: response.data.qr_link,
        },
      );
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  async getSchoolInfo(school_id: string) {
    const payload = { school_id };
    const token = jwt.sign(payload, process.env.PAYMENTS_SERVICE_SECRET!, {
      noTimestamp: true,
    });

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-school-data?token=${token}`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
      },
    };
    try {
      const { data: info } = await axios.request(config);
      console.log(info);

      return info;
    } catch (e) {
      console.log(e.message);
    }
  }

  async sendTransactionmail(email: string, request: CollectRequest) {
    const collectReqStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: request._id,
      });
    if (!collectReqStatus) {
      throw new Error('Collect request status not found');
    }
    const __dirname = path.resolve();
    const filePath = path.join(
      __dirname,
      'src/template/transactionTemplate.html',
    );
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const student_data = JSON.parse(request.additional_data);
    console.log(student_data);

    const { student_name, student_email, student_phone_no } =
      student_data.student_details;

    const replacements = {
      transactionId: request._id.toString(),
      transactionAmount: collectReqStatus.transaction_amount,
      transactionDate: collectReqStatus.updatedAt?.toString(),
      studentName: student_name || ' NA',
      studentEmailId: student_email || 'NA',
      studentPhoneNo: student_phone_no || 'NA',
    };

    const htmlToSend = template(replacements);
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
      to: email,
      subject: `Edviron - Transaction success |order ID: ${replacements.transactionId}, order amount: INR ${replacements.transactionAmount}`,
      // html: emailContent,
      html: htmlToSend,
    };
    const info = await transporter.sendMail(mailOptions);

    return 'mail sent successfully';
  }

  async sendErpWebhook(webHookUrl: string[], webhookData: any) {
    if (webHookUrl !== null) {
      const amount = webhookData.amount;
      const webHookData = await sign({
        collect_id: webhookData.collect_id,
        amount,
        status: webhookData.status,
        trustee_id: webhookData.trustee_id,
        school_id: webhookData.school_id,
        req_webhook_urls: webhookData?.req_webhook_urls,
        custom_order_id: webhookData.custom_order_id,
        createdAt: webhookData.createdAt,
        transaction_time: webhookData?.updatedAt,
        additional_data: webhookData.additional_data,
        formattedTransactionDate: webhookData?.formattedDate,
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
    }
  }

  async test() {
    const data = {
      customer_details: {
        customer_email: null,
        customer_id: '7112AAA812234',
        customer_name: null,
        customer_phone: '9898989898',
      },
      order: {
        order_amount: 1,
        order_currency: 'INR',
        order_id: '670cf66fc95a5c255c5b0fc9',
        order_tags: null,
      },
      payment: {
        auth_id: null,
        bank_reference: '437848809219',
        cf_payment_id: 3140236156,
        payment_amount: 6.9,
        payment_currency: 'INR',
        payment_group: 'upi',
        payment_message: '00::APPROVED OR COMPLETED SUCCESSFULLY',
        payment_method: { upi: { channel: null, upi_id: '9074296363@ybl' } },
        payment_status: 'SUCCESS',
        payment_time: '2024-10-14T16:17:28+05:30',
      },
      payment_gateway_details: {
        gateway_name: 'CASHFREE',
        gateway_order_id: '3392076382',
        gateway_order_reference_id: 'null',
        gateway_payment_id: '3140236156',
        gateway_settlement: 'CASHFREE',
        gateway_status_code: null,
      },
      payment_offers: null,
    };

    const data2 = {
      customer_details: {
        customer_email: null,
        customer_id: '7112AAA812234',
        customer_name: null,
        customer_phone: '9898989898',
      },
      order: {
        order_amount: 1,
        order_currency: 'INR',
        order_id: '670b788613f8cf9da453fe56',
        order_tags: null,
      },
      payment: {
        auth_id: null,
        bank_reference: '138772344109',
        cf_payment_id: 3136782300,
        payment_amount: 1.02,
        payment_currency: 'INR',
        payment_group: 'upi',
        payment_message: '00::APPROVED OR COMPLETED SUCCESSFULLY',
        payment_method: { upi: { channel: null, upi_id: '9074296363@axl' } },
        payment_status: 'SUCCESS',
        payment_time: '2024-10-13T13:07:16+05:30',
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
    };
  }

  /*************  ✨ Codeium Command ⭐  *************/
  /******  ec0ac6bf-aa20-4d78-8de8-0b19d7c37dc6  *******/ async createVendor(
    client_id: string,
    vendor_info: {
      vendor_id: string;
      status: string;
      name: string;
      email: string;
      phone: string;
      verify_account: string;
      dashboard_access: string;
      schedule_option: number;
      bank: { account_number: string; account_holder: string; ifsc: string };
      kyc_details: {
        account_type: string;
        business_type: string;
        uidai?: string;
        gst?: string;
        cin?: string;
        pan?: string;
        passport_number?: string;
      };
    },
  ) {
    const axios = require('axios');
    let data = JSON.stringify(vendor_info);
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/easy-split/vendors`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': client_id,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
      data: data,
    };
    console.log(config, 'config');

    try {
      const { data: Response } = await axios.request(config);
      console.log(Response, 'Res');

      return Response;
    } catch (e) {
      if (e?.response?.data) {
        throw new BadRequestException(e.response.data.message);
      }

      throw new BadRequestException(e.message);
    }
  }

  async getVendorTransactions(query: any, limit: number, page: number) {
    console.log(query);

    const totalCount =
      await this.databaseService.VendorTransactionModel.countDocuments(query);

    const totalPages = Math.ceil(totalCount / limit);

    const vendorsTransaction =
      await this.databaseService.VendorTransactionModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

    return {
      vendorsTransaction: vendorsTransaction,
      totalCount,
      page,
      limit,
      totalPages,
    };
  }

  async getTransactionReportBatched(
    trustee_id: string,
    start_date: string,
    end_date: string,
    status?: string | null,
    school_id?: string | null,
  ) {
    try {
      const endOfDay = new Date(end_date);
      const startDates = new Date(start_date)
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      endOfDay.setHours(23, 59, 59, 999);
      let collectQuery: any = {
        trustee_id: trustee_id,
        createdAt: {
          // $gte: new Date(start_date),
          // $lt: endOfDay,
          $gte: new Date(startDates.getTime()- 24 * 60 * 60 * 1000),
          $lt: new Date(endOfDay.getTime()+ 24 * 60 * 60 * 1000),
        },
      };

      if (school_id) {
        collectQuery = {
          ...collectQuery,
          school_id: school_id,
        };
      }
      const orders = await this.databaseService.CollectRequestModel.find(collectQuery).select('_id');

      let transactions: any[] = [];

      const orderIds = orders.map((order: any) => order._id);

      let query: any = {
        collect_id: { $in: orderIds },
        // status: { $regex: new RegExp(`^${status}$`, 'i') }
      };

      const startDate = new Date(start_date);
      const endDate = end_date;

      console.log(new Date(endDate), 'End date before adding hr');

      console.log(endOfDay, 'end date after adding hr');

      if (startDate && endDate) {
        query = {
          ...query,
          createdAt: {
            $gte: startDate,
            $lt: endOfDay,
          },
        };
      }
      // console.log(`getting transaction`);
      if ((status && status === 'SUCCESS') || status === 'PENDING') {
        console.log('adding status to transaction');

        query = {
          ...query,
          status: { $regex: new RegExp(`^${status}$`, 'i') },
        };
      }

      if (school_id) {
      }

      transactions =
        await this.databaseService.CollectRequestStatusModel.aggregate([
          {
            $match: query, // Apply your filters
          },
          {
            $project: {
              collect_id: 1,
              transaction_amount: 1,
              order_amount: 1,
              status: 1,
              createdAt: 1,
            },
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
            $unwind: '$collect_request', // Flatten the joined data
          },
          {
            $group: {
              _id: '$collect_request.trustee_id', // Group by `trustee_id`
              totalTransactionAmount: { $sum: '$transaction_amount' },
              totalOrderAmount: { $sum: '$order_amount' },
              // totalTransactions: { $sum: 1 }, // Count total transactions
            },
          },
          {
            $project: {
              _id: 0, // Remove the `_id` field
              // trustee_id: '$_id', // Rename `_id` to `trustee_id`
              totalTransactionAmount: 1,
              totalOrderAmount: 1,
              // totalTransactions: 1,
            },
          },
        ]);

      console.timeEnd('transactionsCount');
      return {
        transactions,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
