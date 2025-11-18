import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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
import { Types } from 'mongoose';
import { RazorpayService } from '../razorpay/razorpay.service';
@Injectable()
export class EdvironPgService implements GatewayService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cashfreeService: CashfreeService,
    private readonly razorpayService: RazorpayService,
  ) { }
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
    vendorgateway?: {
      easebuzz: boolean;
      cashfree: boolean;
    },
    easebuzzVendors?: [
      {
        vendor_id: string;
        amount?: number;
        name?: string;
      },
    ],
    cashfreeVedors?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
      },
    ],
    easebuzz_school_label?: string | null,
    isSelectGateway?: boolean | null,
  ): Promise<Transaction | undefined> {
    try {
      let paymentInfo: PaymentIds = {
        cashfree_id: null,
        easebuzz_id: null,
        easebuzz_cc_id: null,
        easebuzz_dc_id: null,
        ccavenue_id: null,
        easebuzz_upi_id: null,
        razorpay_order_id: null,
      };
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }

      const razorpay_vendors = collectReq.razorpay_vendors_info;

      const schoolName = school_name.replace(/ /g, '-'); //replace spaces because url dosent support spaces
      const axios = require('axios');
      const currentTime = new Date();
      // Add 20 minutes to the current time test
      const expiryTime = new Date(currentTime.getTime() + 20 * 60000);

      // Format the expiry time in ISO 8601 format with the timezone offset
      const isoExpiryTime = expiryTime.toISOString();
      let additionalFieldsEntries = {};

      if (request.additionalDataToggle) {
        const additionalData = JSON.parse(request.additional_data);
        const additional_fields = additionalData.additional_fields || {};
        additionalFieldsEntries = additional_fields;
      }

      let data = JSON.stringify({
        customer_details: {
          customer_id: '7112AAA812234',
          customer_phone: '9898989898',
        },
        order_currency: request.currency,
        order_amount: request.amount.toFixed(2),
        order_id: request._id,
        order_meta: {
          return_url:
            process.env.URL +
            '/edviron-pg/callback?collect_request_id=' +
            request._id,
        },
        order_expiry_time: isoExpiryTime,
        order_tags: additionalFieldsEntries,
      });

      console.log(data, 'datadatadata');

      if (splitPayments && cashfreeVedors && cashfreeVedors.length > 0) {
        const vendor_data = cashfreeVedors
          .filter(({ amount, percentage }) => {
            // Check if either amount is greater than 0 or percentage is greater than 0
            return (amount && amount > 0) || (percentage && percentage > 0);
          })
          .map(({ vendor_id, percentage, amount }) => ({
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
          order_tags: additionalFieldsEntries,
        });

        collectReq.isSplitPayments = true;
        collectReq.vendors_info = vendor;
        await collectReq.save();

        cashfreeVedors.map(async (info) => {
          const { vendor_id, percentage, amount, name } = info;
          let split_amount = 0;
          if (amount) {
            split_amount = amount;
          }
          if (percentage && percentage !== 0) {
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
      if (!isSelectGateway && request.easebuzz_sub_merchant_id) {
        if (!easebuzz_school_label) {
          throw new BadRequestException(
            `Split Information Not Configure Please contact tarun.k@edviron.com`,
          );
        }
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

        encodedParams.set('productinfo', productinfo);
        encodedParams.set('firstname', firstname);
        encodedParams.set('phone', '9898989898');
        encodedParams.set('email', email);
        encodedParams.set('surl', easebuzz_cb_surl);
        encodedParams.set('furl', easebuzz_cb_furl);
        encodedParams.set('hash', hash);
        encodedParams.set('request_flow', 'SEAMLESS');
        encodedParams.set('sub_merchant_id', request.easebuzz_sub_merchant_id);
        let ezb_split_payments: { [key: string]: number } = {};
        if (
          vendorgateway?.easebuzz &&
          easebuzzVendors &&
          easebuzz_school_label &&
          easebuzzVendors.length > 0
        ) {
          let vendorTotal = 0;
          for (const vendor of easebuzzVendors) {
            if (vendor.name && typeof vendor.amount === 'number') {
              ezb_split_payments[vendor.vendor_id] = vendor.amount;
              vendorTotal += vendor.amount;
            }
            if (!vendorgateway.cashfree) {
              await new this.databaseService.VendorTransactionModel({
                vendor_id: vendor.vendor_id,
                amount: vendor.amount,
                collect_id: request._id,
                gateway: Gateway.EDVIRON_EASEBUZZ,
                status: TransactionStatus.PENDING,
                trustee_id: request.trustee_id,
                school_id: request.school_id,
                custom_order_id: request.custom_order_id || '',
                name: vendor.name, // Ensure you assign the vendor's name
              }).save();
            }
          }

          const remainingAmount = request.amount - vendorTotal;
          // remainig balance will go to sub-merchant-id in split
          if (remainingAmount > 0) {
            ezb_split_payments[easebuzz_school_label] = remainingAmount;
          }

          encodedParams.set(
            'split_payments',
            JSON.stringify(ezb_split_payments),
          );
        }
        // in case of split false 100% amount goes to sub merchant
        else {
          ezb_split_payments[easebuzz_school_label] = request.amount;
          encodedParams.set(
            'split_payments',
            JSON.stringify(ezb_split_payments),
          );
        }

        const Ezboptions = {
          method: 'POST',
          url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          data: encodedParams,
        };

        const { data: easebuzzRes } = await axios.request(Ezboptions);

        id = easebuzzRes.data;
        paymentInfo.easebuzz_id = id || null;
        await this.getQr(request._id.toString(), request, ezb_split_payments); // uncomment after fixing easebuzz QR code issue
        easebuzz_pg = true;
      }

      let cf_payment_id = '';
      if (request.clientId) {
        const { data: cashfreeRes } = await axios.request(config);
        cf_payment_id = cashfreeRes.payment_session_id;
        paymentInfo.cashfree_id = cf_payment_id || null;
        if (!request.isVBAPayment) {
          setTimeout(
            () => {
              this.terminateOrder(request._id.toString());
            },
            25 * 60 * 1000,
          ); // 25 minutes in milliseconds
        }
      }
      console.log(request.razorpay_seamless.razorpay_mid, 'mid');

      console.log(request.razorpay_seamless.razorpay_mid, 'mid');
      let razorpay_id = '';
      let razorpay_pg = false;
      if (
        request.razorpay_seamless.razorpay_mid &&
        request.razorpay_seamless.razorpay_id
      ) {
        if (splitPayments && razorpay_vendors && razorpay_vendors.length > 0) {
          collectReq.vendors_info = vendor;
          await collectReq.save();
          razorpay_vendors.map(async (info) => {
            const {
              vendor_id,
              percentage,
              amount,
              notes,
              name,
              linked_account_notes,
              on_hold,
              on_hold_until,
            } = info;
            let split_amount = 0;
            if (amount) {
              split_amount = amount;
            }
            if (percentage && percentage !== 0) {
              split_amount = (request.amount * percentage) / 100;
            }
            await new this.databaseService.VendorTransactionModel({
              vendor_id: vendor_id,
              amount: split_amount,
              collect_id: request._id,
              gateway: Gateway.EDVIRON_RAZORPAY,
              status: TransactionStatus.PENDING,
              trustee_id: request.trustee_id,
              school_id: request.school_id,
              custom_order_id: request.custom_order_id || '',
              name,
              razorpay_vendors: info,
            }).save();
          });
        }
        console.log('creating order with razorpay');
        const data = await this.razorpayService.createOrder(request);
        razorpay_id = data?.id;
        paymentInfo.razorpay_order_id = razorpay_id || null;
        if (razorpay_id) {
          razorpay_pg = true;
        }
      }

      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      const encodedPlatformCharges = encodeURIComponent(
        JSON.stringify(platform_charges),
      );
      collectReq.paymentIds = paymentInfo;
      await collectReq.save();
      if (collectReq.isCFNonSeamless) {
        console.log('cfnion seamless');

        return {
          url: `${process.env.URL}/cashfree/redirect?session_id=${cf_payment_id}`,
        };
      }

      let newcurrency = request.currency ? request.currency : 'INR';
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
          id +
          '&razorpay_pg=' +
          razorpay_pg +
          '&razorpay_id=' +
          razorpay_id +
          '&currency=' +
          newcurrency,
      };
    } catch (err) {
      if (err.name === 'AxiosError')
        throw new BadRequestException(
          'Invalid client id or client secret ' +
          JSON.stringify(err.response.data),
        );
    }
  }
  async checkStatus(
    collect_request_id: String,
    collect_request: CollectRequest,
  ): Promise<{
    status: TransactionStatus;
    amount: number;
    transaction_amount?: number;
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
      if (!collect_status) {
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

      const settlementInfo = await this.cashfreeService.settlementStatus(
        collect_request._id.toString(),
        collect_request.clientId,
      );

      let formatedStatus =
        order_status_to_transaction_status_map[
        cashfreeRes.order_status as keyof typeof order_status_to_transaction_status_map
        ];
      if (collect_status.status === PaymentStatus.USER_DROPPED) {
        formatedStatus = TransactionStatus.USER_DROPPED;
      }

      if (
        collect_status.status.toUpperCase() === 'FAILED' ||
        collect_status.status.toUpperCase() === 'FAILURE'
      ) {
        formatedStatus = TransactionStatus.FAILURE;
      }
      let paymentId: string | null = null;
      try {
        paymentId = await this.getPaymentId(
          collect_request_id.toString(),
          collect_request,
        );
        if (paymentId) {
          paymentId = paymentId?.toString();
        }
      } catch (e) {
        paymentId = null;
      }
      const paymentinfo = await this.cashfreeService.checkPaymentStatus(
        collect_request._id.toString(),
        collect_request
      )
      

      return {
        status: formatedStatus,
        amount: cashfreeRes.order_amount,
        transaction_amount: Number(collect_status?.transaction_amount),
        status_code,
        details: {
          payment_mode: collect_status.payment_method,
          bank_ref:
            paymentinfo?.bank_reference || collect_status?.bank_reference,
          payment_methods:
           paymentinfo.payment_method|| collect_status?.details &&
            JSON.parse(collect_status.details as string),
          transaction_time,
          formattedTransactionDate: istDate,
          order_status: cashfreeRes.order_status,
          isSettlementComplete: settlementInfo.isSettlementComplete,
          transfer_utr: settlementInfo.transfer_utr,
          service_charge: settlementInfo.service_charge,
          paymentId: paymentId,
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
    const requestStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: request._id,
      });
    if (!requestStatus) {
      throw new Error('Collect Request Status not found');
    }
    if (request.gateway !== Gateway.PENDING) {
      if (request.isQRPayment && requestStatus.status === 'PENDING') {
        requestStatus.status = TransactionStatus.USER_DROPPED;
        requestStatus.payment_message = 'SESSION EXPIRED';
        requestStatus.reason = 'SESSION EXPIRED';
        await requestStatus.save();
      }
      return true;
    }
    if (requestStatus.status === TransactionStatus.PENDING) {
      requestStatus.status = TransactionStatus.USER_DROPPED;
      requestStatus.payment_message = 'SESSION EXPIRED';
      requestStatus.reason = 'SESSION EXPIRED';
      await requestStatus.save();
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

    return statusRes;
  }

  async getPaymentDetails(school_id: string, startDate: string, mode: string) {
    try {
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
      return data;
    } catch (e) {
      throw new BadRequestException('Error fetching payment details');
    }
  }

  async getQr(
    collect_id: string,
    request: CollectRequest,
    ezb_split_payments: { [key: string]: number },
  ) {
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

      encodedParams.set('productinfo', productinfo);
      encodedParams.set('firstname', firstname);
      encodedParams.set('phone', '9898989898');
      encodedParams.set('email', email);
      encodedParams.set('surl', easebuzz_cb_surl);
      encodedParams.set('furl', easebuzz_cb_furl);
      encodedParams.set('hash', hash);
      encodedParams.set('request_flow', 'SEAMLESS');
      encodedParams.set('sub_merchant_id', request.easebuzz_sub_merchant_id);
      encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));

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
      console.log(response.data);

      await this.databaseService.CollectRequestModel.findByIdAndUpdate(
        collect_id,
        {
          deepLink: response.data.qr_link,
        },
      );
    } catch (error) {
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

      return info;
    } catch (e) {
      console.log(e.message);
    }
  }

  async getAllSchoolInfo(school_id: string) {
    const payload = { school_id };
    const token = jwt.sign(payload, process.env.PAYMENTS_SERVICE_SECRET!, {
      noTimestamp: true,
    });

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-school-all-data?token=${token}`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
      },
    };

    try {
      const { data: info } = await axios.request(config);
      console.log({ info });

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

  async sendErpWebhook(
    webHookUrl: string[],
    webhookData: any,
    webhook_key?: string | null,
  ) {
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
        transaction_time: webhookData?.transaction_time,
        additional_data: webhookData.additional_data,
        formattedTransactionDate: webhookData?.formattedDate,
        details: webhookData?.details,
        transaction_amount: webhookData?.transaction_amount,
        bank_reference: webhookData?.bank_reference,
        payment_method: webhookData?.payment_method,
        payment_details: webhookData?.payment_details,
        installments: webhookData?.installments
      });
      let base64Header = '';
      if (webhook_key) {
        base64Header = 'Basic ' + Buffer.from(webhook_key).toString('base64');
      }

      const createConfig = (url: string) => ({
        method: 'post',
        maxBodyLength: Infinity,
        url: url,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: base64Header,
        },
        data: webHookData,
      });

      try {
        try {
          const sendWebhook = async (url: string) => {
            try {
              const res = await axios.request(createConfig(url));

              const currentIST = new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Kolkata',
              });

              const resDataString =
                typeof res.data === 'string'
                  ? res.data
                  : JSON.stringify(res.data) || 'undefined';
              try {
                await this.databaseService.ErpWebhooksLogsModel.create({
                  collect_id: webHookData.collect_id,
                  webhooktype: 'Transaction Webhook',
                  payload: JSON.stringify(webhookData),
                  webhook_url: url,
                  school_id: webHookData.school_id,
                  trustee_id: webHookData.trustee_id,
                  isSuccess: true,
                  response: resDataString,
                  status_code: res.status.toString() || 'undefined',
                  triggered_time: currentIST,
                });
              } catch (e) {
                console.log('Error in saving webhook');
              }
            } catch (e) {
              if (e.response?.data) {
                const currentIST = new Date().toLocaleString('en-US', {
                  timeZone: 'Asia/Kolkata',
                });
                await this.databaseService.ErpWebhooksLogsModel.create({
                  collect_id: webHookData.collect_id,
                  webhooktype: 'Transaction Webhook',
                  payload: JSON.stringify(webhookData),
                  webhook_url: url,
                  school_id: webHookData.school_id,
                  trustee_id: webHookData.trustee_id,
                  isSuccess: false,
                  response: JSON.stringify(e.response.data) || 'undefined',
                  status_code: e.response.status || 'undefined',
                  triggered_time: currentIST,
                });
              }
            }
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

  async createVendor(
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

    try {
      const { data: Response } = await axios.request(config);
      return Response;
    } catch (e) {
      if (e?.response?.data) {
        throw new BadRequestException(e.response.data.message);
      }

      throw new BadRequestException(e.message);
    }
  }

  async checkCreatedVendorStatus(vendor_id: string, client_id: string) {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.CASHFREE_ENDPOINT}/pg/easy-split/vendors/${vendor_id}`,
        headers: {
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
      };
      const { data } = await axios.request(config);
      return {
        name: data?.name,
        email: data?.email,
        vendor_id: data?.vendor_id,
        status: data?.status,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  async convertISTStartToUTC(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);

    // Create the date at 00:00 IST (start of the given day in IST)
    const istStartDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    // Subtract the 5 hours 30 minutes offset to convert IST to UTC
    const utcStartTime = new Date(
      istStartDate.getTime() - 5 * 60 * 60 * 1000 - 30 * 60 * 1000,
    );

    return utcStartTime.toISOString();
  }

  async convertISTEndToUTC(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);

    // Create the date at 23:59:59.999 IST (end of the given day in IST)
    const istEndDate = new Date(Date.UTC(year, month - 1, day, 18, 30, 9, 979));
    return istEndDate.toISOString();
  }

  async getVendorTransactions(
    query: any,
    limit: number,
    page: number,
    payment_modes?: string[],
  ) {
    try {
      console.time('overallTransaction');
      if (payment_modes?.includes('upi')) {
        payment_modes = [...payment_modes, 'upi_credit_card'];
      }

      let mainQuery = { ...query };
      if (payment_modes?.length) {
        const paymentFilteredIds =
          await this.databaseService.CollectRequestStatusModel.distinct(
            'collect_id',
            { payment_method: { $in: payment_modes } },
          );
        mainQuery.collect_id = { $in: paymentFilteredIds };
      }

      console.time('Getting vendor transaction');
      const pipeline: any[] = [
        { $match: mainQuery },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: 'collectrequeststatuses',
            localField: 'collect_id',
            foreignField: 'collect_id',
            pipeline: [
              {
                $project: {
                  payment_method: 1,
                  transaction_amount: 1,
                  status: 1,
                  payment_time: 1,
                  isAutoRefund: 1,
                },
              },
            ],
            as: 'collectrequeststatuses',
          },
        },
        {
          $lookup: {
            from: 'collectrequests',
            localField: 'collect_id',
            foreignField: '_id',
            pipeline: [
              { $project: { additional_data: 1, custom_order_id: 1 } },
            ],
            as: 'collectRequest',
          },
        },
        {
          $addFields: {
            collectrequeststatuses: {
              $arrayElemAt: ['$collectrequeststatuses', 0],
            },
            collectRequest: { $arrayElemAt: ['$collectRequest', 0] },
          },
        },
        {
          $project: {
            'collectrequeststatuses._id': 0,
            'collectRequest._id': 0,
            'collectrequeststatuses.collect_id': 0,
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                '$$ROOT',
                '$collectrequeststatuses',
                '$collectRequest',
              ],
            },
          },
        },
        { $project: { collectrequeststatuses: 0, collectRequest: 0 } },
      ];

      const vendorsTransaction =
        await this.databaseService.VendorTransactionModel.aggregate(pipeline);
      console.timeEnd('Getting vendor transaction');

      // Step 3: Get total count
      console.time('counting transactions');
      const totalCount =
        await this.databaseService.VendorTransactionModel.countDocuments(
          mainQuery,
        );
      console.timeEnd('counting transactions');

      const totalPages = Math.ceil(totalCount / limit);
      console.timeEnd('overallTransaction');
      if (
        (query.custom_order_id || query.collect_id) &&
        vendorsTransaction.length === 0
      ) {
        throw new BadRequestException(
          'No transactions found for the given query',
        );
      }
      return {
        vendorsTransaction,
        totalCount,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  async getSingleTransactionInfo(collect_id: string) {
    let transaction;
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new BadRequestException('order not found');
    }
    try {
      transaction = await this.databaseService.CollectRequestModel.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(collect_id),
          },
        },
        {
          $lookup: {
            from: 'collectrequeststatuses',
            localField: '_id',
            foreignField: 'collect_id',
            as: 'collect_req_status',
          },
        },
        {
          $unwind: {
            path: '$collect_req_status',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            collect_id: '$_id',
            amount: 1,
            gateway: 1,
            school_id: 1,
            trustee_id: 1,
            custom_order_id: 1,
            vendors_info: 1,
            payment_id: '$payment_id',
            additional_data: 1,
            isQRPayment: 1,
            status: '$collect_req_status.status',
            bank_reference: '$collect_req_status.bank_reference',
            details: '$collect_req_status.details',
            transactionAmount: '$collect_req_status.transaction_amount',
            transactionStatus: '$collect_req_status.status',
            transactionTime: '$collect_req_status.payment_time',
            payment_method: '$collect_req_status.payment_method',
            payment_time: '$collect_req_status.payment_time',
            transaction_amount: '$collect_req_status.transaction_amount',
            order_amount: '$collect_req_status.order_amount',
            isAutoRefund: '$collect_req_status.isAutoRefund',
            reason: '$collect_req_status.reason',
            createdAt: 1,
            updatedAt: 1,
            error_details: '$collect_req_status.error_details',
            currency: 1,
          },
        },
      ]);
      if (request.gateway === 'EDVIRON_PG') {
        try {
          const config = {
            method: 'GET',
            url: `https://api.cashfree.com/pg/orders/${collect_id}/settlements`,
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'x-api-version': '2023-08-01',
              'x-partner-apikey': process.env.CASHFREE_API_KEY,
              'x-partner-merchantid': request.clientId,
            },
          };
          const response = await axios.request(config);
          const { transfer_utr, transfer_time } = response.data;
          if (
            request.payment_id === null ||
            request.payment_id === '' ||
            request.payment_id === undefined
          ) {
            const cf_payment_id = await this.getPaymentId(collect_id, request);
            request.payment_id = cf_payment_id;
            await request.save();
            try {
              transaction[0] = {
                ...transaction[0],
                payment_id: cf_payment_id,
              };
            } catch (error) {
              transaction[0] = {
                ...transaction[0],
                payment_id: null,
              };
            }
          }
          transaction[0] = {
            ...transaction[0],
            utr_number: transfer_utr || null,
            settlement_transfer_time: transfer_time || null,
          };
        } catch (error) {
          transaction[0] = {
            ...transaction[0],
            utr_number: null,
            settlement_transfer_time: null,
          };
        }
      }
      return transaction;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Something went wrong',
      );
    }
  }

  async getPaymentId(collect_id: string, request: CollectRequest) {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url:
          `${process.env.CASHFREE_ENDPOINT}/pg/orders/` +
          collect_id +
          `/payments`,
        headers: {
          accept: 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': request.clientId,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
      };
      try {
        const { data: response } = await axios.request(config);
        return response[0].cf_payment_id || null;
      } catch (e) {
        return null;
      }
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Something went wrong',
      );
    }
  }

  async getTransactionReportBatched(
    trustee_id: string,
    start_date: string,
    end_date: string,
    status?: string | null,
    school_id?: string[],
  ) {
    try {
      const endOfDay = new Date(end_date);
      const startDates = new Date(start_date);
      const startOfDayUTC = new Date(
        await this.convertISTStartToUTC(start_date),
      ); // Start of December 6 in IST
      const endOfDayUTC = new Date(await this.convertISTEndToUTC(end_date));
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      endOfDay.setHours(23, 59, 59, 999);
      let collectQuery: any = {
        trustee_id: trustee_id,
        createdAt: {
          // $gte: new Date(start_date),
          // $lt: endOfDay,
          $gte: new Date(startDates.getTime() - 24 * 60 * 60 * 1000),
          $lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      };

      if (school_id && school_id.length > 0) {
        collectQuery = {
          ...collectQuery,
          school_id: { $in: school_id },
        };
      }
      const orders =
        await this.databaseService.CollectRequestModel.find(
          collectQuery,
        ).select('_id');

      let transactions: any[] = [];

      const orderIds = orders.map((order: any) => order._id);

      let query: any = {
        collect_id: { $in: orderIds },
        // status: { $regex: new RegExp(`^${status}$`, 'i') }
      };

      const startDate = new Date(start_date);
      const endDate = end_date;
      if (startDate && endDate) {
        query = {
          ...query,
          updatedAt: {
            $gte: startOfDayUTC,
            $lt: endOfDayUTC,
            // $gte: new Date('2024-12-05T18:31:00.979+00:00'),
            // $lte: new Date(istEndDate),
          },
        };
      }

      if ((status && status === 'SUCCESS') || status === 'PENDING') {
        query = {
          ...query,
          status: { $in: [status.toUpperCase(), status.toLowerCase()] },
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
          // {
          //   $project:{
          //     collect_id:'$collect_id',
          //     transaction_amount: 1,
          //     order_amount: 1,
          //     custom_id:'$collect_request.custom_order_id'

          //   }
          // },
          {
            $group: {
              _id: '$collect_request.trustee_id', // Group by `trustee_id`
              totalTransactionAmount: { $sum: '$transaction_amount' },
              totalOrderAmount: { $sum: '$order_amount' },
              totalTransactions: { $sum: 1 }, // Count total transactions
            },
          },
          {
            $project: {
              _id: 0, // Remove the `_id` field
              // trustee_id: '$_id', // Rename `_id` to `trustee_id`
              totalTransactionAmount: 1,
              totalOrderAmount: 1,
              totalTransactions: 1,
            },
          },
        ]);

      console.timeEnd('transactionsCount');
      return {
        length: transactions.length,
        transactions,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async subtrusteeTransactionAggregation(
    trustee_id: string,
    start_date: string,
    end_date: string,
    school_id: string[],
    status?: string | null,
    mode?: string[] | null,
    isQRPayment?: boolean | null,
    gateway?: string[] | null,
  ) {
    try {
      const endOfDay = new Date(end_date);
      const startDates = new Date(start_date);
      const startOfDayUTC = new Date(
        await this.convertISTStartToUTC(start_date),
      ); // Start of December 6 in IST
      const endOfDayUTC = new Date(await this.convertISTEndToUTC(end_date));
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      endOfDay.setHours(23, 59, 59, 999);
      let collectQuery: any = {
        trustee_id: trustee_id,
        school_id: { $in: school_id },
        createdAt: {
          // $gte: new Date(start_date),
          // $lt: endOfDay,
          $gte: new Date(startDates.getTime() - 24 * 60 * 60 * 1000),
          $lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      };
      console.log({ collectQuery });

      if (isQRPayment) {
        collectQuery = {
          ...collectQuery,
          isQRPayment: true,
        };
      }
      if (gateway) {
        collectQuery = {
          ...collectQuery,
          gateway: { $in: gateway },
        };
      }

      const orders =
        await this.databaseService.CollectRequestModel.find(
          collectQuery,
        ).select('_id');

      let transactions: any[] = [];

      const orderIds = orders.map((order: any) => order._id);
      let query: any = {
        collect_id: { $in: orderIds },
        // status: { $regex: new RegExp(`^${status}$`, 'i') }
      };

      const startDate = new Date(start_date);
      const endDate = end_date;

      if (startDate && endDate) {
        query = {
          ...query,
          $or: [
            {
              payment_time: {
                $ne: null, // Matches documents where payment_time exists and is not null
                $gte: startOfDayUTC,
                $lt: endOfDayUTC,
              },
            },
            {
              $and: [
                { payment_time: { $eq: null } }, // Matches documents where payment_time is null or doesn't exist
                {
                  updatedAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                  },
                },
              ],
            },
          ],
        };
      }

      if ((status && status === 'SUCCESS') || status === 'PENDING') {
        query = {
          ...query,
          status: { $in: [status.toUpperCase(), status.toLowerCase()] },
        };
      }
      if (school_id) {
      }

      if (mode) {
        query = {
          ...query,
          payment_method: { $in: mode },
        };
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
          // {
          //   $project:{
          //     collect_id:'$collect_id',
          //     transaction_amount: 1,
          //     order_amount: 1,
          //     custom_id:'$collect_request.custom_order_id'

          //   }
          // },
          {
            $group: {
              _id: '$collect_request.trustee_id', // Group by `trustee_id`
              totalTransactionAmount: { $sum: '$transaction_amount' },
              totalOrderAmount: { $sum: '$order_amount' },
              totalTransactions: { $sum: 1 }, // Count total transactions
            },
          },
          {
            $project: {
              _id: 0, // Remove the `_id` field
              // trustee_id: '$_id', // Rename `_id` to `trustee_id`
              totalTransactionAmount: 1,
              totalOrderAmount: 1,
              totalTransactions: 1,
            },
          },
        ]);

      console.timeEnd('transactionsCount');

      return {
        transactions: transactions[0],
      };
    } catch (e) {
      console.log(e);
      throw new Error(e.message);
    }
  }

  async getTransactionReportBatchedFilterdV2(
    trustee_id: string,
    start_date: string,
    end_date: string,
    status?: string | null,
    school_id?: string[] | null,
    mode?: string[] | null,
    isQRPayment?: boolean | null,
    gateway?: string[] | null,
  ) {
    try {
      const endOfDay = new Date(end_date);
      const startDates = new Date(start_date);
      const startOfDayUTC = new Date(
        await this.convertISTStartToUTC(start_date),
      ); // Start of December 6 in IST
      const endOfDayUTC = new Date(await this.convertISTEndToUTC(end_date));
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      endOfDay.setHours(23, 59, 59, 999);
      let collectQuery: any = {
        trustee_id: trustee_id,
        createdAt: {
          // $gte: new Date(start_date),
          // $lt: endOfDay,
          $gte: new Date(startDates.getTime() - 24 * 60 * 60 * 1000),
          $lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      };

      if (!school_id || school_id.length === 0) {
        try {
          const payload = { trustee_id };
          const token = jwt.sign(
            payload,
            process.env.PAYMENTS_SERVICE_SECRET!,
            {
              noTimestamp: true,
            },
          );

          const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-all-schools?token=${token}`,
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
            },
          };

          const { data: schoolsData } = await axios.request(config);
          school_id = schoolsData.schools.map((school: any) =>
            school.school_id.toString(),
          );
        } catch (error) {
          console.error('Error fetching schools:', error.message);
          throw new BadRequestException('Failed to fetch schools');
        }
      }

      if (school_id && school_id.length > 0) {
        collectQuery = {
          ...collectQuery,
          school_id: { $in: school_id },
        };
      }

      if (isQRPayment) {
        collectQuery = {
          ...collectQuery,
          isQRPayment: true,
        };
      }
      if (gateway) {
        collectQuery = {
          ...collectQuery,
          gateway: { $in: gateway },
        };
      }

      const orders =
        await this.databaseService.CollectRequestModel.find(
          collectQuery,
        ).select('_id');

      let transactions: any[] = [];

      const orderIds = orders.map((order: any) => order._id);

      let query: any = {
        collect_id: { $in: orderIds },
        // status: { $regex: new RegExp(`^${status}$`, 'i') }
      };

      const startDate = new Date(start_date);
      const endDate = end_date;

      if (startDate && endDate) {
        query = {
          ...query,
          $or: [
            {
              payment_time: {
                $ne: null, // Matches documents where payment_time exists and is not null
                $gte: startOfDayUTC,
                $lt: endOfDayUTC,
              },
            },
            {
              $and: [
                { payment_time: { $eq: null } }, // Matches documents where payment_time is null or doesn't exist
                {
                  updatedAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                  },
                },
              ],
            },
          ],
        };
      }

      if ((status && status === 'SUCCESS') || status === 'PENDING') {
        query = {
          ...query,
          status: { $in: [status.toUpperCase(), status.toLowerCase()] },
        };
      }
      if (school_id) {
      }

      if (mode) {
        query = {
          ...query,
          payment_method: { $in: mode },
        };
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
          // {
          //   $project:{
          //     collect_id:'$collect_id',
          //     transaction_amount: 1,
          //     order_amount: 1,
          //     custom_id:'$collect_request.custom_order_id'

          //   }
          // },
          {
            $group: {
              _id: '$collect_request.trustee_id', // Group by `trustee_id`
              totalTransactionAmount: { $sum: '$transaction_amount' },
              totalOrderAmount: { $sum: '$order_amount' },
              totalTransactions: { $sum: 1 }, // Count total transactions
            },
          },
          {
            $project: {
              _id: 0, // Remove the `_id` field
              // trustee_id: '$_id', // Rename `_id` to `trustee_id`
              totalTransactionAmount: 1,
              totalOrderAmount: 1,
              totalTransactions: 1,
            },
          },
        ]);

      console.timeEnd('transactionsCount');

      return {
        length: transactions.length,
        transactions,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getTransactionReportBatchedFilterd(
    trustee_id: string,
    start_date: string,
    end_date: string,
    status?: string | null,
    school_id?: string | null,
    mode?: string[] | null,
    isQRPayment?: boolean | null,
    gateway?: string[] | null,
  ) {
    try {
      const endOfDay = new Date(end_date);
      const startDates = new Date(start_date);
      const startOfDayUTC = new Date(
        await this.convertISTStartToUTC(start_date),
      ); // Start of December 6 in IST
      const endOfDayUTC = new Date(await this.convertISTEndToUTC(end_date));
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      endOfDay.setHours(23, 59, 59, 999);
      let collectQuery: any = {
        trustee_id: trustee_id,
        createdAt: {
          // $gte: new Date(start_date),
          // $lt: endOfDay,
          $gte: new Date(startDates.getTime() - 24 * 60 * 60 * 1000),
          $lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      };

      if (school_id) {
        collectQuery = {
          ...collectQuery,
          school_id: school_id,
        };
      }

      if (isQRPayment) {
        collectQuery = {
          ...collectQuery,
          isQRPayment: true,
        };
      }
      if (gateway) {
        collectQuery = {
          ...collectQuery,
          gateway: { $in: gateway },
        };
      }

      const orders =
        await this.databaseService.CollectRequestModel.find(
          collectQuery,
        ).select('_id');

      let transactions: any[] = [];

      const orderIds = orders.map((order: any) => order._id);

      let query: any = {
        collect_id: { $in: orderIds },
        // status: { $regex: new RegExp(`^${status}$`, 'i') }
      };

      const startDate = new Date(start_date);
      const endDate = end_date;

      if (startDate && endDate) {
        query = {
          ...query,
          $or: [
            {
              payment_time: {
                $ne: null, // Matches documents where payment_time exists and is not null
                $gte: startOfDayUTC,
                $lt: endOfDayUTC,
              },
            },
            {
              $and: [
                { payment_time: { $eq: null } }, // Matches documents where payment_time is null or doesn't exist
                {
                  updatedAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                  },
                },
              ],
            },
          ],
        };
      }

      if ((status && status === 'SUCCESS') || status === 'PENDING') {
        query = {
          ...query,
          status: { $in: [status.toUpperCase(), status.toLowerCase()] },
        };
      }
      if (school_id) {
      }

      if (mode) {
        query = {
          ...query,
          payment_method: { $in: mode },
        };
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
          // {
          //   $project:{
          //     collect_id:'$collect_id',
          //     transaction_amount: 1,
          //     order_amount: 1,
          //     custom_id:'$collect_request.custom_order_id'

          //   }
          // },
          {
            $group: {
              _id: '$collect_request.trustee_id', // Group by `trustee_id`
              totalTransactionAmount: { $sum: '$transaction_amount' },
              totalOrderAmount: { $sum: '$order_amount' },
              totalTransactions: { $sum: 1 }, // Count total transactions
            },
          },
          {
            $project: {
              _id: 0, // Remove the `_id` field
              // trustee_id: '$_id', // Rename `_id` to `trustee_id`
              totalTransactionAmount: 1,
              totalOrderAmount: 1,
              totalTransactions: 1,
            },
          },
        ]);

      console.timeEnd('transactionsCount');

      return {
        length: transactions.length,
        transactions,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async generateBacthTransactions(
    trustee_id: string,
    start_date: string,
    end_date: string,
    status?: string | null,
  ) {
    try {
      // const page = Number(req.query.page) || 1;
      // const limit = Number(req.query.limit) || 10;

      // const startDate = req.query.startDate || null;
      // const endDate = req.query.endDate || null;
      // const status = req.query.status || null;

      // let decrypted = jwt.verify(token, process.env.KEY!) as any;
      // if (
      //   JSON.stringify({
      //     ...JSON.parse(JSON.stringify(decrypted)),
      //     iat: undefined,
      //     exp: undefined,
      //   }) !==
      //   JSON.stringify({
      //     trustee_id,
      //   })
      // ) {
      //   throw new ForbiddenException('Request forged');
      // }
      const monthsFull = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      if (!trustee_id) {
        throw new BadRequestException('Trustee ID is required');
      }

      const startDate = new Date(start_date);
      const startOfDayUTC = new Date(
        await this.convertISTStartToUTC(start_date),
      );
      const endDate = end_date;
      const endOfDay = new Date(endDate);
      const endOfDayUTC = new Date(await this.convertISTEndToUTC(end_date));
      let collectQuery: any = {
        trustee_id: trustee_id,
        createdAt: {
          $gte: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
          $lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      };

      const orders = await this.databaseService.CollectRequestModel.find({
        ...collectQuery,
      }).select('_id');

      let transactions: any[] = [];

      const orderIds = orders.map((order: any) => order._id);
      let query: any = {
        collect_id: { $in: orderIds },
      };

      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      // endOfDay.setHours(23, 59, 59, 999);
      // console.log(startOfDayUTC, 'startOfDayUTC');
      // console.log(endOfDayUTC, 'endOfDayUTC');
      if (startDate && endDate) {
        query = {
          ...query,
          $or: [
            {
              payment_time: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC,
              },
            },
            {
              $and: [
                { payment_time: { $eq: null } }, // Matches documents where payment_time is null or doesn't exist
                {
                  updatedAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                  },
                },
              ],
            },
          ],
        };
      }

      if ((status && status === 'SUCCESS') || status === 'PENDING') {
        query = {
          ...query,
          status: { $regex: new RegExp(`^${status}$`, 'i') },
        };
      }

      const checkbatch =
        await this.databaseService.BatchTransactionModel.findOne({
          trustee_id: trustee_id,
          month: monthsFull[new Date(endDate).getMonth()],
          year: new Date(endDate).getFullYear().toString(),
        });
      if (checkbatch) {
        await this.databaseService.ErrorLogsModel.create({
          type: 'BATCH TRANSACTION CORN',
          des: `Batch transaction already exists for trustee_id ${trustee_id} of ${monthsFull[new Date(endDate).getMonth()]
            } month`,
          identifier: trustee_id,
          body: `${JSON.stringify({ startDate, endDate, status })}`,
        });
        throw new BadRequestException(
          `Already exists for trustee_id ${trustee_id} of ${monthsFull[new Date(endDate).getMonth()]
          } month`,
        );
      }

      const transactionsCount =
        await this.databaseService.CollectRequestStatusModel.countDocuments(
          query,
        );

      transactions =
        await this.databaseService.CollectRequestStatusModel.aggregate([
          {
            $match: query, // Apply your filters
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
              totalTransactions: { $sum: 1 }, // Count total transactions
            },
          },
          {
            $project: {
              _id: 0, // Remove the `_id` field
              trustee_id: '$_id', // Rename `_id` to `trustee_id`
              totalTransactionAmount: 1,
              totalOrderAmount: 1,
              totalTransactions: 1,
            },
          },
        ]);

      if (transactions.length > 0) {
        await new this.databaseService.BatchTransactionModel({
          trustee_id: transactions[0].trustee_id,
          total_order_amount: transactions[0].totalOrderAmount,
          total_transaction_amount: transactions[0].totalTransactionAmount,
          total_transactions: transactions[0].totalTransactions,
          month: monthsFull[new Date(endDate).getMonth()],
          year: new Date(endDate).getFullYear().toString(),
          status,
        }).save();
      }
      return {
        transactions,
        totalTransactions: transactionsCount,
        month: monthsFull[new Date(endDate).getMonth()],
        year: new Date(endDate).getFullYear().toString(),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async generateMerchantBacthTransactions(
    school_id: string,
    start_date: string,
    end_date: string,
    status?: string | null,
  ) {
    try {
      // const page = Number(req.query.page) || 1;
      // const limit = Number(req.query.limit) || 10;

      // const startDate = req.query.startDate || null;
      // const endDate = req.query.endDate || null;
      // const status = req.query.status || null;

      // let decrypted = jwt.verify(token, process.env.KEY!) as any;
      // if (
      //   JSON.stringify({
      //     ...JSON.parse(JSON.stringify(decrypted)),
      //     iat: undefined,
      //     exp: undefined,
      //   }) !==
      //   JSON.stringify({
      //     trustee_id,
      //   })
      // ) {
      //   throw new ForbiddenException('Request forged');
      // }
      const monthsFull = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      if (!school_id) {
        throw new BadRequestException('School ID is required');
      }

      const startDate = new Date(start_date);
      const startOfDayUTC = new Date(
        await this.convertISTStartToUTC(start_date),
      );
      const endDate = end_date;
      const endOfDay = new Date(endDate);
      const endOfDayUTC = new Date(await this.convertISTEndToUTC(end_date));
      let collectQuery: any = {
        school_id: school_id,
        createdAt: {
          $gte: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
          $lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      };

      const orders = await this.databaseService.CollectRequestModel.find({
        ...collectQuery,
      }).select('_id');

      let transactions: any[] = [];

      const orderIds = orders.map((order: any) => order._id);
      let query: any = {
        collect_id: { $in: orderIds },
      };

      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      // endOfDay.setHours(23, 59, 59, 999);
      // console.log(startOfDayUTC, 'startOfDayUTC');
      // console.log(endOfDayUTC, 'endOfDayUTC');
      if (startDate && endDate) {
        query = {
          ...query,
          $or: [
            {
              payment_time: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC,
              },
            },
            {
              $and: [
                { payment_time: { $eq: null } }, // Matches documents where payment_time is null or doesn't exist
                {
                  updatedAt: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC,
                  },
                },
              ],
            },
          ],
        };
      }

      if ((status && status === 'SUCCESS') || status === 'PENDING') {
        query = {
          ...query,
          status: { $regex: new RegExp(`^${status}$`, 'i') },
        };
      }

      const checkbatch =
        await this.databaseService.BatchTransactionModel.findOne({
          school_id: school_id,
          month: monthsFull[new Date(endDate).getMonth()],
          year: new Date(endDate).getFullYear().toString(),
        });
      if (checkbatch) {
        await this.databaseService.ErrorLogsModel.create({
          type: 'BATCH TRANSACTION CORN',
          des: `Batch transaction already exists for school_id ${school_id} of ${monthsFull[new Date(endDate).getMonth()]
            } month`,
          identifier: school_id,
          body: `${JSON.stringify({ startDate, endDate, status })}`,
        });
        throw new BadRequestException(
          `Already exists for school_id ${school_id} of ${monthsFull[new Date(endDate).getMonth()]
          } month`,
        );
      }

      const transactionsCount =
        await this.databaseService.CollectRequestStatusModel.countDocuments(
          query,
        );

      transactions =
        await this.databaseService.CollectRequestStatusModel.aggregate([
          {
            $match: query, // Apply your filters
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
              totalTransactions: { $sum: 1 }, // Count total transactions
            },
          },
          {
            $project: {
              _id: 0, // Remove the `_id` field
              trustee_id: '$_id', // Rename `_id` to `trustee_id`
              totalTransactionAmount: 1,
              totalOrderAmount: 1,
              totalTransactions: 1,
            },
          },
        ]);

      if (transactions.length > 0) {
        await new this.databaseService.BatchTransactionModel({
          school_id: school_id,
          total_order_amount: transactions[0].totalOrderAmount,
          total_transaction_amount: transactions[0].totalTransactionAmount,
          total_transactions: transactions[0].totalTransactions,
          month: monthsFull[new Date(endDate).getMonth()],
          year: new Date(endDate).getFullYear().toString(),
          status,
        }).save();
      }
      return {
        transactions,
        totalTransactions: transactionsCount,
        month: monthsFull[new Date(endDate).getMonth()],
        year: new Date(endDate).getFullYear().toString(),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBatchTransactions(trustee_id: string, year: string) {
    try {
      const batch = await this.databaseService.BatchTransactionModel.find({
        trustee_id,
        year,
      });

      if (!batch) {
        throw new Error('Batch not found');
      }
      return batch;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getMerchantBatchTransactions(school_id: string, year: string) {
    try {
      const batch = await this.databaseService.BatchTransactionModel.find({
        school_id,
        year,
      });

      if (!batch) {
        throw new Error('Batch not found');
      }
      return batch;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getSUbTrusteeBatchTransactions(school_id: string[], year: string) {
    try {
      const batch = await this.databaseService.BatchTransactionModel.find({
        school_id: { $in: school_id },
        year,
      });

      if (!batch) {
        throw new Error('Batch not found');
      }
      return batch;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getSubTrusteeBatchTransactions(school_ids: string[], year: string) {
    try {
      const batch = await this.databaseService.BatchTransactionModel.aggregate([
        {
          $match: {
            school_id: { $in: school_ids },
            year: year,
          },
        },
        {
          $project: {
            order_amount: 1,
            transaction_amount: {
              $ifNull: ['$transaction_amount', '$order_amount'], // example projection
            },
          },
        },
        {
          $group: {
            _id: null,
            total_order_amount: { $sum: '$order_amount' },
            total_transaction_amount: { $sum: '$transaction_amount' },
            total_transactions: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            total_order_amount: 1,
            total_transaction_amount: 1,
            total_transactions: 1,
          },
        },
      ]);

      if (!batch || batch.length === 0) {
        throw new Error('Batch not found');
      }

      return batch[0];
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getSingleTransaction(collect_id: string) {
    const objId = new Types.ObjectId(collect_id);
    const vendotTransaction =
      await this.databaseService.CollectRequestModel.aggregate([
        {
          $match: { _id: objId },
        },
        {
          $lookup: {
            from: 'collectrequeststatuses',
            localField: '_id',
            foreignField: 'collect_id',
            as: 'collect_request_status',
          },
        },
        {
          $unwind: {
            path: '$collect_request_status',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            amount: 1,
            collect_id: '$collect_request_status.collect_id',
            gateway: 1,
            vendor_id: 1,
            school_id: 1,
            trustee_id: 1,
            custom_order_id: 1,
            createdAt: 1,
            updatedAt: 1,
            name: 1,
            payment_method: '$collect_request_status.payment_method',
            bank_reference: '$collect_request_status.bank_reference',
            details: '$collect_request_status.details',
            transaction_amount: '$collect_request_status.transaction_amount',
            additional_data: 1,
            vendors_info: '$collect_request_status.vendors_info',
            reason: '$collect_request_status.reason',
            status: '$collect_request_status.status',
          },
        },
      ]);

    return vendotTransaction[0];
  }

  async sendMailAfterTransaction(collect_id: string) {
    try {
      if (!collect_id) {
        throw new BadRequestException('Collect ID is required');
      }
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new NotFoundException('Collect Request not found');
      }
      const getTransactionInfo =
        await this.getSingleTransactionInfo(collect_id);
      if (!getTransactionInfo) {
        throw new NotFoundException('Transaction not found');
      }
      try {
        const config = {
          url: `${process.env.VANILLA_SERVICE_ENDPOINT}/business-alarm/send-mail-after-transaction`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          data: getTransactionInfo[0],
        };
        await axios.request(config);
      } catch (error) {
        console.error('Error sending email:', error.message);
        throw new BadRequestException('Failed to send email');
      }
      return true;
    } catch (e) {
      console.error(e);
      throw new BadRequestException(e.message);
    }
  }

  async retriveEasebuzz(txnid: string, key: string, salt: string) {
    const hashString = `${key}|${txnid}|${salt}`;
    const hashValue = await calculateSHA512Hash(hashString);

    try {
      const requestData: any = {
        txnid,
        key,
        hash: hashValue,
      };
      const config = {
        method: 'post',
        url: 'https://dashboard.easebuzz.in/transaction/v2.1/retrieve',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: requestData,
      };

      const { data } = await axios.request(config);
      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getNonpartnerStatus(collect_id: string) {
    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new BadRequestException('Collect Request not found');
      }
      const collect_req_status =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: request._id,
        });
      if (!collect_req_status) {
        throw new BadRequestException('Collect Request not found');
      }
      const date = new Date(collect_req_status.payment_time);
      const istDate = date.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });

      const installments = await this.databaseService.InstallmentsModel.find({
        collect_id: request._id
      }).select('_id student_id student_name status fee_heads').lean();
      const renamedInstallments = installments.map(i => ({
        installment_id: i._id,
        ...i,
      }));
      const transformedResponse = {
        status: collect_req_status?.status,
        status_code: 200,
        custom_order_id: request.custom_order_id,
        amount: collect_req_status.order_amount,
        transaction_amount:
          collect_req_status.transaction_amount ||
          collect_req_status.order_amount,
        details: {
          payment_mode: collect_req_status.payment_method,
          bank_ref:
            collect_req_status?.bank_reference &&
            collect_req_status?.bank_reference,
          payment_methods:
            collect_req_status?.details &&
            JSON.parse(collect_req_status.details as string),
          transaction_time: collect_req_status.payment_time.toISOString(),
          formattedTransactionDate: istDate,
          order_status: collect_req_status?.status,
          isSettlementComplete: null,
          transfer_utr: null,
          service_charge: null,
        },
        capture_status: collect_req_status?.status,
        installments: renamedInstallments || null
      };
      return transformedResponse;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
