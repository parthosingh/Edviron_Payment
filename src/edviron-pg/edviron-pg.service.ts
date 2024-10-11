import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CollectRequest,
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
@Injectable()
export class EdvironPgService implements GatewayService {
  constructor(private readonly databaseService: DatabaseService) {}
  async collect(
    request: CollectRequest,
    platform_charges: platformChange[],
    school_name: any,
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
        console.log({ easebuzzRes, _id: request._id });
      }

      let cf_payment_id = '';
      if (request.clientId) {
        const { data: cashfreeRes } = await axios.request(config);
        cf_payment_id = cashfreeRes.payment_session_id;
        paymentInfo.cashfree_id = cf_payment_id || null;
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

      console.log(cashfreeRes, 'cashfree status response');

      const order_status_to_transaction_status_map = {
        ACTIVE: TransactionStatus.PENDING,
        PAID: TransactionStatus.SUCCESS,
        EXPIRED: TransactionStatus.FAILURE,
        TERMINATED: TransactionStatus.FAILURE,
        TERMINATION_REQUESTED: TransactionStatus.FAILURE,
      };

      const collect_status =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: collect_request_id,
        });
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
          order_status: cashfreeRes.order_status,
        },
      };
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
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
      url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-school-data?school_id=${school_id}`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
      },
    };
    const { data: info } = await axios.request(config);
    return info;
  }

 

  async sendTransactionmail(email: string,request:CollectRequest) {
    const collectReqStatus=await this.databaseService.CollectRequestStatusModel.findOne({collect_id:request._id})
    if(!collectReqStatus){
      throw new Error('Collect request status not found')
    }
    const __dirname = path.resolve();
    const filePath = path.join(
      __dirname,
      'src/template/transactionTemplate.html',
    );   
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const student_data=JSON.parse(request.additional_data)
    console.log(student_data);
    
    const {student_name,student_email,student_phone_no}=student_data.student_details
   
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
      html:htmlToSend
    };
    const info = await transporter.sendMail(mailOptions);

    return 'mail sent successfully';
  }
}
