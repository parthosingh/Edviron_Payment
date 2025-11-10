import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  CollectRequest,
  Gateway,
} from 'src/database/schemas/collect_request.schema';
import {
  calculateSHA512Hash,
  encryptCard,
  merchantKeyIv,
  merchantKeySHA256,
} from 'src/utils/sign';
import axios from 'axios';
import { TransactionStatus } from 'src/types/transactionStatus';
import { platformChange } from 'src/collect/collect.controller';
import e from 'express';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { CheckStatusService } from 'src/check-status/check-status.service';
import { EdvironPayService } from 'src/edviron-pay/edviron-pay.service';

@Injectable()
export class EasebuzzService {
  constructor(private readonly databaseService: DatabaseService) { }

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
    console.log({ statusRes });

    return statusRes;
  }

  async statusResponse(requestId: string, collectReq: CollectRequest) {
    let statusResponse = await this.easebuzzCheckStatus(requestId, collectReq);
    if (statusResponse.msg.mode === 'NA' || statusResponse.status === false) {
      console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
      statusResponse = await this.easebuzzCheckStatus(
        `upi_${requestId}`,
        collectReq,
      );
    }

    return statusResponse;
  }

  async statusResponsev2(requestId: string, collectReq: CollectRequest) {
    try {
      let statusResponse = await this.easebuzzWebhookCheckStatusV2(
        requestId,
        collectReq,
      );
      console.log({ statusResponse });

      if (statusResponse.msg.mode === 'NA' || statusResponse.status === false) {
        console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
        statusResponse = await this.easebuzzWebhookCheckStatusV2(
          `upi_${requestId}`,
          collectReq,
        );
      }
      console.log(statusResponse);

      return statusResponse;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async initiateRefund(
    collect_id: string,
    refund_amount: number,
    refund_id: string,
  ) {
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectRequest) {
      throw new BadRequestException('Collect Request not found');
    }

    const transaction = await this.statusResponse(collect_id, collectRequest);
    console.log(transaction.msg.easepayid);
    const order_id = transaction.msg.easepayid;
    if (!order_id) {
      throw new BadRequestException('Order ID not found');
    }

    // key|merchant_refund_id|easebuzz_id|refund_amount|salt
    const hashStringV2 = `${process.env.EASEBUZZ_KEY
      }|${refund_id}|${order_id}|${refund_amount.toFixed(1)}|${process.env.EASEBUZZ_SALT
      }`;

    let hash2 = await calculateSHA512Hash(hashStringV2);
    const data2 = {
      key: process.env.EASEBUZZ_KEY,
      merchant_refund_id: refund_id,
      easebuzz_id: order_id,
      refund_amount: refund_amount.toFixed(1),
      // refund_amount: 1.0.toFixed(1),
      hash: hash2,
      // amount: parseFloat(total_amount).toFixed(2),
      // email: email,
      // phone: phone,
      // salt: process.env.EASEBUZZ_SALT,
    };
    const config = {
      method: 'POST',
      url: `https://dashboard.easebuzz.in/transaction/v2/refund`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: data2,
    };
    try {
      console.log('initiating refund with easebuzz');

      const response = await axios(config);
      console.log(response.data);
      // console.log({
      //   hashString,
      //   hash,
      // });
      return response.data;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async initiateRefundv2(
    collect_id: string,
    refund_amount: number,
    refund_id: string,
  ) {
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectRequest) {
      throw new BadRequestException('Collect Request not found');
    }

    const transaction = await this.statusResponse(collect_id, collectRequest);
    console.log(transaction.msg.easepayid);
    const order_id = transaction.msg.easepayid;
    if (!order_id) {
      throw new BadRequestException('Order ID not found');
    }

    const easebuzz_key = collectRequest.easebuzz_non_partner_cred.easebuzz_key;
    const easebuzz_salt =
      collectRequest.easebuzz_non_partner_cred.easebuzz_salt;
    // key|merchant_refund_id|easebuzz_id|refund_amount|salt
    const hashStringV2 = `${easebuzz_key}|${refund_id}|${order_id}|${refund_amount.toFixed(
      1,
    )}|${easebuzz_salt}`;

    let hash2 = await calculateSHA512Hash(hashStringV2);
    const data2 = {
      key: easebuzz_key,
      merchant_refund_id: refund_id,
      easebuzz_id: order_id,
      refund_amount: refund_amount.toFixed(1),
      // refund_amount: 1.0.toFixed(1),
      hash: hash2,
      // amount: parseFloat(total_amount).toFixed(2),
      // email: email,
      // phone: phone,
      // salt: process.env.EASEBUZZ_SALT,
    };
    const config = {
      method: 'POST',
      url: `https://dashboard.easebuzz.in/transaction/v2/refund`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: data2,
    };
    try {
      console.log('initiating refund with easebuzz');

      const response = await axios(config);
      console.log(response.data);
      // console.log({
      //   hashString,
      //   hash,
      // });
      return response.data;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }
  async checkRefundSttaus(collect_id: string) {
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectRequest) {
      throw new BadRequestException('Collect Request not found');
    }

    const transaction = await this.statusResponse(collect_id, collectRequest);
    console.log(transaction.msg.easepayid);
    const order_id = transaction.msg.easepayid;
    if (!order_id) {
      throw new BadRequestException('Order ID not found');
    }
    if (collectRequest.easebuzz_non_partner) {
      const easebuzz_key =
        collectRequest.easebuzz_non_partner_cred.easebuzz_key;
      const easebuzz_salt =
        collectRequest.easebuzz_non_partner_cred.easebuzz_salt;
      const hashString = `${easebuzz_key}|${order_id}|${easebuzz_salt}`;

      let hash = await calculateSHA512Hash(hashString);
      const data = {
        key: easebuzz_key,
        easebuzz_id: order_id,
        hash: hash,
      };

      const config = {
        method: 'POST',
        url: `https://dashboard.easebuzz.in/refund/v1/retrieve`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        data: data,
      };
      try {
        console.log('checking refund status with easebuzz');

        const response = await axios(config);
        console.log(response.data);
        // console.log({
        //   hashString,
        //   hash,
        // });
        return response.data;
      } catch (e) {
        console.log(e);
        throw new BadRequestException(e.message);
      }
    }
    const hashString = `${process.env.EASEBUZZ_KEY}|${order_id}|${process.env.EASEBUZZ_SALT}`;

    let hash = await calculateSHA512Hash(hashString);
    const data = {
      key: process.env.EASEBUZZ_KEY,
      easebuzz_id: order_id,
      hash: hash,
    };

    const config = {
      method: 'POST',
      url: `https://dashboard.easebuzz.in/refund/v1/retrieve`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: data,
    };
    try {
      console.log('checking refund status with easebuzz');

      const response = await axios(config);
      console.log(response.data);
      // console.log({
      //   hashString,
      //   hash,
      // });
      return response.data;
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  async getQrBase64(collect_id: string) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new BadRequestException('Collect Request not found');
      }
      collectRequest.gateway = Gateway.EDVIRON_EASEBUZZ;
      await collectRequest.save();
      const upiIntentUrl = collectRequest.deepLink;
      var QRCode = require('qrcode');
      const qrCodeBase64 = await QRCode.toDataURL(upiIntentUrl, {
        margin: 2,
        width: 300,
      });

      const qrBase64 = qrCodeBase64.split(',')[1];
      return {
        intentUrl: upiIntentUrl,
        qrCodeBase64: qrBase64,
        collect_id,
      };
    } catch (e) {
      console.log(e.message);
    }
  }

  async updateDispute(
    case_id: string,
    action: string,
    reason: string,
    documents: Array<{ document_type: any; file_url: string }>,
  ) {
    const hash = await calculateSHA512Hash(process.env.EASEBUZZ_KEY);
    const config = {
      method: 'post',
      url: `https://drs.easebuzz.in/api/v1/merchant/case/update_status/`,
      headers: {
        key: process.env.EASEBUZZ_KEY,
        hash,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: {
        case_id: case_id,
        action: action,
        reason: reason,
        documents: documents,
      },
    };
    try {
      const { data } = await axios.request(config);
      return data;
    } catch (error) {
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  // split payment order creation
  async createOrderV2(
    request: CollectRequest,
    platform_charges: platformChange[],
    school_name: string,
  ) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
      const { additional_data } = collectReq;
      if (request.isSplitPayments) {
        if (!request.easebuzz_split_label) {
          throw new BadRequestException(
            `Split Information Not Configure Please contact tarun.k@edviron.com`,
          );
        }
        const studentDetail = JSON.parse(additional_data);
        const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
        const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;

        const easebuzz_sub_merchant_id =
          request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
        // Easebuzz pg data
        let productinfo = 'payment gateway customer';
        let firstname =
          studentDetail.student_details?.student_name || 'customer';
        let email =
          studentDetail.student_details?.student_email || 'noreply@edviron.com';
        let student_id = studentDetail?.student_details?.student_id || 'NA';
        let student_phone_no =
          studentDetail?.student_details?.student_phone_no || '0000000000';
        const additionalData = studentDetail.additional_fields || {};
        let topFiveData: any = [];
      if (request.additionalDataToggle) {
        topFiveData = Object.entries(additionalData).slice(0, 5);
      } else {
        topFiveData = Object.entries(additionalData).slice(0, 0);
      }
      const topFiveObject = Object.fromEntries(topFiveData);

        const udfValues = [
          student_id,
          student_phone_no,
          ...Object.values(topFiveObject),
        ];

        const udfPadded = [
          ...udfValues,
          ...new Array(Math.max(0, 10 - udfValues.length)).fill(''),
        ].slice(0, 10);

        const hashData2 = [
          easebuzz_key,
          request._id,
          parseFloat(request.amount.toFixed(2)),
          productinfo,
          firstname,
          email,
          ...udfPadded,
          easebuzz_salt,
        ].join('|');

        // let hashData =
        //   easebuzz_key +
        //   '|' +
        //   request._id +
        //   '|' +
        //   parseFloat(request.amount.toFixed(2)) +
        //   '|' +
        //   productinfo +
        //   '|' +
        //   firstname +
        //   '|' +
        //   email +
        //   '|' +
        //   student_id +
        //   '|' +
        //   student_phone_no +
        //   '|' +
        //   '||||||||' +
        //   easebuzz_salt;

        const easebuzz_cb_surl =
          process.env.URL +
          '/easebuzz/easebuzz-callback?collect_request_id=' +
          request._id +
          '&status=pass';

        const easebuzz_cb_furl =
          process.env.URL +
          '/easebuzz/easebuzz-callback?collect_request_id=' +
          request._id +
          '&status=fail';

        let hash = await calculateSHA512Hash(hashData2);
        let encodedParams = new URLSearchParams();
        encodedParams.set(
          'key',
          request.easebuzz_non_partner_cred.easebuzz_key,
        );
        encodedParams.set('txnid', request._id.toString());
        encodedParams.set(
          'amount',
          parseFloat(request.amount.toFixed(2)).toString(),
        );

        encodedParams.set('productinfo', productinfo);
        encodedParams.set('firstname', firstname);
        encodedParams.set('phone', student_phone_no);
        encodedParams.set('email', email);
        encodedParams.set('surl', easebuzz_cb_surl);
        encodedParams.set('furl', easebuzz_cb_furl);
        encodedParams.set('hash', hash);
        encodedParams.set('request_flow', 'SEAMLESS');
        // encodedParams.set('udf1', student_id);
        // encodedParams.set('udf2', student_phone_no);
        udfPadded.forEach((val, index) => {
          encodedParams.set(`udf${index + 1}`, val);
        });
        // udfPadded.forEach((val, index) => {
        // encodedParams.set(`udf${index + 1}`, val);
        // });
        // encodedParams.set('sub_merchant_id', easebuzz_sub_merchant_id);
        let ezb_split_payments: { [key: string]: number } = {};

        if (
          request.isSplitPayments &&
          request.easebuzzVendors &&
          request.easebuzz_split_label &&
          request.easebuzzVendors.length > 0
        ) {
          let vendorTotal = 0;
          for (const vendor of request.easebuzzVendors) {
            if (vendor.name && typeof vendor.amount === 'number') {
              ezb_split_payments[vendor.vendor_id] = vendor.amount;
              vendorTotal += vendor.amount;
            }

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

          const remainingAmount = request.amount - vendorTotal;
          // remainig balance will go to sub-merchant-id in split
          if (remainingAmount > 0) {
            ezb_split_payments[request.easebuzz_split_label] = remainingAmount;
          }
          encodedParams.set(
            'split_payments',
            JSON.stringify(ezb_split_payments),
          );
        }
        // in case of split false 100% amount goes to sub merchant
        else {
          ezb_split_payments[request.easebuzz_split_label] = request.amount;
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

        console.log(Ezboptions, 'Ezboptions');
        const disabled_modes_string = request.disabled_modes
          .map((mode) => `${mode}=false`)
          .join('&');
        const encodedPlatformCharges = encodeURIComponent(
          JSON.stringify(platform_charges),
        );

        const { data: easebuzzRes } = await axios.request(Ezboptions);
        console.log(easebuzzRes, ' easebuzzRes');

        const easebuzzPaymentId = easebuzzRes.data;
        collectReq.paymentIds.easebuzz_id = easebuzzPaymentId;
        await collectReq.save();
        await this.getQr(request._id.toString(), request, ezb_split_payments); // uncomment after fixing easebuzz QR code issue
        // return {
        //   collect_request_id: request._id,
        //   collect_request_url: `${process.env.URL}/easebuzz/redirect?&collect_id=${request._id}&easebuzzPaymentId=${easebuzzPaymentId}`,
        // };

        return {
          collect_request_id: request._id,
          collect_request_url:
            process.env.URL +
            '/edviron-pg/redirect?' +
            '&collect_request_id=' +
            request._id +
            '&amount=' +
            request.amount.toFixed(2) +
            '&' +
            disabled_modes_string +
            '&platform_charges=' +
            encodedPlatformCharges +
            '&school_name=' +
            school_name +
            '&easebuzz_pg=' +
            true +
            '&payment_id=' +
            easebuzzPaymentId,
        };
      }
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async createOrderV2NonSplit(
    request: CollectRequest,
    platform_charges: platformChange[],
    school_name: string,
    easebuzz_school_label?: string | null,
    isMasterGateway?: boolean,
  ) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
      const { additional_data } = collectReq;
      const studentDetail = JSON.parse(additional_data);

      const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
      const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
      const easebuzz_sub_merchant_id =
        request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
      // Easebuzz pg data

      let productinfo = 'payment gateway customer';
      let firstname = (
        studentDetail.student_details?.student_name || 'customer'
      ).trim();
      let email =
        studentDetail.student_details?.student_email || 'noreply@edviron.com';
      let student_id = studentDetail?.student_details?.student_id || 'NA';
      let student_phone_no =
        studentDetail?.student_details?.student_phone_no || '0000000000';
      const additionalData = studentDetail.additional_fields || {};
      let topFiveData: any = [];
      if (request.additionalDataToggle) {
        topFiveData = Object.entries(additionalData).slice(0, 5);
      } else {
        topFiveData = Object.entries(additionalData).slice(0, 0);
      }
      const topFiveObject = Object.fromEntries(topFiveData);

      const udfValues = [
        student_id,
        student_phone_no,
        ...Object.values(topFiveObject),
      ];

      const udfPadded = [
        ...udfValues,
        ...new Array(Math.max(0, 10 - udfValues.length)).fill(''),
      ].slice(0, 10);

      const hashData2 = [
        easebuzz_key,
        request._id,
        parseFloat(request.amount.toFixed(2)),
        productinfo,
        firstname,
        email,
        ...udfPadded,
        easebuzz_salt,
      ].join('|');
      // console.log(hashData);

      // let hashData =
      //   easebuzz_key +
      //   '|' +
      //   request._id +
      //   '|' +
      //   parseFloat(request.amount.toFixed(2)) +
      //   '|' +
      //   productinfo +
      //   '|' +
      //   firstname +
      //   '|' +
      //   email +
      //   '|' +
      //   student_id +
      //   '|' +
      //   student_phone_no +
      //   '|' +
      //   '||||||||' +
      //   easebuzz_salt;
      // console.log(hashData, 'hashData');
      console.log(hashData2, 'hashData2');
      let hash = await calculateSHA512Hash(hashData2);

      const easebuzz_cb_surl =
        process.env.URL +
        '/easebuzz/easebuzz-callback/?collect_request_id=' +
        request._id +
        '&status=pass';

      const easebuzz_cb_furl =
        process.env.URL +
        '/easebuzz/easebuzz-callback/?collect_request_id=' +
        request._id +
        '&status=fail';

      let encodedParams = new URLSearchParams();
      encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
      encodedParams.set('txnid', request._id.toString());
      encodedParams.set(
        'amount',
        parseFloat(request.amount.toFixed(2)).toString(),
      );

      encodedParams.set('productinfo', productinfo);
      encodedParams.set('firstname', firstname);
      encodedParams.set('phone', student_phone_no);
      encodedParams.set('email', email);
      encodedParams.set('surl', easebuzz_cb_surl);
      encodedParams.set('furl', easebuzz_cb_furl);
      encodedParams.set('hash', hash);
      encodedParams.set('request_flow', 'SEAMLESS');
      // encodedParams.set('udf1', student_id);
      // encodedParams.set('udf2', student_phone_no);
      udfPadded.forEach((val, index) => {
        encodedParams.set(`udf${index + 1}`, val);
      });
      // encodedParams.set('sub_merchant_id', easebuzz_sub_merchant_id);
      let ezb_split_payments: { [key: string]: number } = {};

      if (request.easebuzz_split_label) {
        ezb_split_payments[request.easebuzz_split_label] = request.amount;
        encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
      }

      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      const encodedPlatformCharges = encodeURIComponent(
        JSON.stringify(platform_charges),
      );
      const Ezboptions = {
        method: 'POST',
        url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        data: encodedParams,
      };

      console.log(Ezboptions, 'Ezboptions');

      const { data: easebuzzRes } = await axios.request(Ezboptions);
      console.log(easebuzzRes, 'easebuzzRessss NON UPI');
      const easebuzzPaymentId = easebuzzRes.data;
      if (collectReq.paymentIds) {
        console.log('payment id ');

        collectReq.paymentIds.easebuzz_id = easebuzzPaymentId;
      } else {
        collectReq.paymentIds = { easebuzz_id: easebuzzPaymentId as string };
      }
      await collectReq.save();
      await this.getQrNonSplit(request._id.toString(), request); // uncomment after fixing easebuzz QR code issue
      // return {
      //   collect_request_id: request._id,
      //   collect_request_url: `${process.env.URL}/easebuzz/redirect?&collect_id=${request._id}&easebuzzPaymentId=${easebuzzPaymentId}`,
      // };
      const schoolName = school_name.replace(/ /g, '_');
      setTimeout(
        () => {
          this.terminateNotInitiatedOrder(request._id.toString())
        },
        25 * 60 * 1000,
      )
      return {
        collect_request_id: request._id,
        collect_request_url:
          process.env.URL +
          '/edviron-pg/redirect?' +
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
          true +
          '&payment_id=' +
          easebuzzPaymentId,
      };
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async terminateNotInitiatedOrder(
    collect_id: string
  ) {
    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request || !request.createdAt) {
        throw new Error('Collect Request not found');
      }
      const requestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: request._id,
        });
      if (!requestStatus) {
        throw new Error('Collect Request Status not found');
      }
      if (requestStatus.status !== 'PENDING') {
        return
      }
      if (request.gateway !== 'PENDING') {
        const config = {
          method: 'get',
          url: `${process.env.URL}/check-status?transactionId=${collect_id}`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'x-api-version': '2023-08-01',
          }
        }
        const { data: status } = await axios.request(config)
        // const status = await this.checkStatusService.checkStatus(request._id.toString())
        if (status.status.toUpperCase() !== 'SUCCESS') {
          requestStatus.status = PaymentStatus.USER_DROPPED
          await requestStatus.save()
        }
        return true

      }
      const createdAt = request.createdAt; // Convert createdAt to a Date object
      const currentTime = new Date();
      const timeDifference = currentTime.getTime() - createdAt.getTime();
      const differenceInMinutes = timeDifference / (1000 * 60);


      if (differenceInMinutes > 25) {
        request.gateway = Gateway.EXPIRED
        requestStatus.status = PaymentStatus.USER_DROPPED
        await request.save()
        await requestStatus.save()
        return true
      }

    } catch (e) {
      throw new BadRequestException(e.message)
    }

    return true
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
      const { additional_data } = collectReq;
      const studentDetail = JSON.parse(additional_data);
      const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
      const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;

      const upi_collect_id = `upi_${collect_id}`;
      let productinfo = 'payment gateway customer';
      let firstname = studentDetail.student_details?.student_name || 'customer';
      let email =
        studentDetail.student_details?.student_email || 'noreply@edviron.com';
      let student_id = studentDetail?.student_details?.student_id || 'NA';
      let student_phone_no =
        studentDetail?.student_details?.student_phone_no || '0000000000';
      const additionalData = studentDetail.additional_fields || {};
let topFiveData: any = [];
      if (request.additionalDataToggle) {
        topFiveData = Object.entries(additionalData).slice(0, 5);
      } else {
        topFiveData = Object.entries(additionalData).slice(0, 0);
      }
      const topFiveObject = Object.fromEntries(topFiveData);

      const udfValues = [
        student_id,
        student_phone_no,
        ...Object.values(topFiveObject),
      ];

      const udfPadded = [
        ...udfValues,
        ...new Array(Math.max(0, 10 - udfValues.length)).fill(''),
      ].slice(0, 10);

      const hashData2 = [
        easebuzz_key,
        upi_collect_id,
        parseFloat(request.amount.toFixed(2)),
        productinfo,
        firstname,
        email,
        ...udfPadded,
        easebuzz_salt,
      ].join('|');

      // let hashData =
      //   easebuzz_key +
      //   '|' +
      //   upi_collect_id +
      //   '|' +
      //   parseFloat(request.amount.toFixed(2)) +
      //   '|' +
      //   productinfo +
      //   '|' +
      //   firstname +
      //   '|' +
      //   email +
      //   '|||||||||||' +
      //   easebuzz_salt;

      const easebuzz_cb_surl =
        process.env.URL +
        '/easebuzz/easebuzz-callback?collect_request_id=' +
        upi_collect_id +
        '&status=pass';

      const easebuzz_cb_furl =
        process.env.URL +
        '/easebuzz/easebuzz-callback?collect_request_id=' +
        upi_collect_id +
        '&status=fail';

      let hash = await calculateSHA512Hash(hashData2);
      let encodedParams = new URLSearchParams();
      encodedParams.set('key', easebuzz_key);
      encodedParams.set('txnid', upi_collect_id);
      encodedParams.set(
        'amount',
        parseFloat(request.amount.toFixed(2)).toString(),
      );

      encodedParams.set('productinfo', productinfo);
      encodedParams.set('firstname', firstname);
      encodedParams.set('phone', student_phone_no);
      encodedParams.set('email', email);
      encodedParams.set('surl', easebuzz_cb_surl);
      encodedParams.set('furl', easebuzz_cb_furl);
      encodedParams.set('hash', hash);
      encodedParams.set('request_flow', 'SEAMLESS');
      // encodedParams.set('sub_merchant_id', request.easebuzz_sub_merchant_id);
      encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
      udfPadded.forEach((val, index) => {
        encodedParams.set(`udf${index + 1}`, val);
      });
      const options = {
        method: 'POST',
        url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        data: encodedParams,
      };

      console.log(options, 'optionsoptions');

      const { data: easebuzzRes } = await axios.request(options);
      console.log({ easebuzzRes });

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
      // console.log(response.data);

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

  async getQrNonSplit(collect_id: string, request: CollectRequest) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
      const { additional_data } = collectReq;
      const studentDetail = JSON.parse(additional_data);
      const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
      const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;

      const upi_collect_id = `upi_${collect_id}`;
      let productinfo = 'payment gateway customer';
      let firstname = studentDetail.student_details?.student_name || 'customer';
      let email =
        studentDetail.student_details?.student_email || 'noreply@edviron.com';
      let student_id = studentDetail?.student_details?.student_id || 'NA';
      let student_phone_no =
        studentDetail?.student_details?.student_phone_no || '0000000000';
      const additionalData = studentDetail.additional_fields || {};
      let topFiveData: any = [];
      if (request.additionalDataToggle) {
        topFiveData = Object.entries(additionalData).slice(0, 5);
      } else {
        topFiveData = Object.entries(additionalData).slice(0, 0);
      }
      const topFiveObject = Object.fromEntries(topFiveData);

      const udfValues = [
        student_id,
        student_phone_no,
        ...Object.values(topFiveObject),
      ];

      const udfPadded = [
        ...udfValues,
        ...new Array(Math.max(0, 10 - udfValues.length)).fill(''),
      ].slice(0, 10);

      const hashData2 = [
        easebuzz_key,
        upi_collect_id,
        parseFloat(request.amount.toFixed(2)),
        productinfo,
        firstname,
        email,
        ...udfPadded,
        easebuzz_salt,
      ].join('|');

      // let hashData =
      //   easebuzz_key +
      //   '|' +
      //   upi_collect_id +
      //   '|' +
      //   parseFloat(request.amount.toFixed(2)) +
      //   '|' +
      //   productinfo +
      //   '|' +
      //   firstname +
      //   '|' +
      //   email +
      //   '|' +
      //   student_id +
      //   '|' +
      //   student_phone_no +
      //   '|' +
      //   '||||||||' +
      //   easebuzz_salt;

      const easebuzz_cb_surl =
        process.env.URL +
        '/easebuzz/easebuzz-callback?collect_request_id=' +
        upi_collect_id +
        '&status=pass';

      const easebuzz_cb_furl =
        process.env.URL +
        '/easebuzz/easebuzz-callback?collect_request_id=' +
        upi_collect_id +
        '&status=fail';

      let hash = await calculateSHA512Hash(hashData2);
      let encodedParams = new URLSearchParams();
      encodedParams.set('key', easebuzz_key);
      encodedParams.set('txnid', upi_collect_id);
      encodedParams.set(
        'amount',
        parseFloat(request.amount.toFixed(2)).toString(),
      );

      encodedParams.set('productinfo', productinfo);
      encodedParams.set('firstname', firstname);
      encodedParams.set('phone', student_phone_no);
      encodedParams.set('email', email);
      encodedParams.set('surl', easebuzz_cb_surl);
      encodedParams.set('furl', easebuzz_cb_furl);
      encodedParams.set('hash', hash);
      encodedParams.set('request_flow', 'SEAMLESS');
      udfPadded.forEach((val, index) => {
        encodedParams.set(`udf${index + 1}`, val);
      });
      // encodedParams.set('sub_merchant_id', easebuzz_sub_merchant_id);
      const options = {
        method: 'POST',
        url: `${process.env.EASEBUZZ_ENDPOINT_PROD}/payment/initiateLink`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        data: encodedParams,
      };
      let ezb_split_payments: { [key: string]: number } = {};

      if (request.easebuzz_split_label) {
        ezb_split_payments[request.easebuzz_split_label] = request.amount;
        encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
      }
      console.log(options, 'Ezboptionsqrcode');
      const { data: easebuzzRes } = await axios.request(options);
      console.log(easebuzzRes, 'UPI');

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

  async easebuzzCheckStatusV2(
    collect_request_id: String,
    collect_request: CollectRequest,
  ) {
    const easebuzz_key = collect_request.easebuzz_non_partner_cred.easebuzz_key;
    const easebuzz_salt =
      collect_request.easebuzz_non_partner_cred.easebuzz_salt;
    const easebuzz_sub_merchant_id =
      collect_request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
    const amount = parseFloat(collect_request.amount.toString()).toFixed(1);

    const axios = require('axios');
    let hashData =
      easebuzz_key +
      '|' +
      collect_request_id +
      '|' +
      amount.toString() +
      '|' +
      'noreply@edviron.com' +
      '|' +
      '9898989898' +
      '|' +
      easebuzz_salt;

    let hash = await calculateSHA512Hash(hashData);
    const qs = require('qs');

    const data = qs.stringify({
      txnid: collect_request_id,
      key: easebuzz_key,
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

  async statusResponseV2(requestId: string, collectReq: CollectRequest) {
    try {
      let statusResponse = await this.easebuzzCheckStatus(
        requestId,
        collectReq,
      );
      if (statusResponse.msg.mode === 'NA') {
        console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
        statusResponse = await this.easebuzzCheckStatus(
          `upi_${requestId}`,
          collectReq,
        );
      }

      return statusResponse;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async easebuzzWebhookCheckStatusV2(
    collect_request_id: String,
    collect_request: CollectRequest,
  ) {
    const amount = parseFloat(collect_request.amount.toString()).toFixed(1);
    const easebuzz_key = collect_request.easebuzz_non_partner_cred.easebuzz_key;
    const easebuzz_salt =
      collect_request.easebuzz_non_partner_cred.easebuzz_salt;
    const easebuzz_sub_merchant_id =
      collect_request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
    const axios = require('axios');
    const { additional_data } = collect_request;
    const studentDetail = JSON.parse(additional_data);
    let firstname = studentDetail.student_details?.student_name || 'customer';
    let email =
      studentDetail.student_details?.student_email || 'noreply@edviron.com';

    let student_id = studentDetail?.student_details?.student_id || 'NA';
    let student_phone_no =
      studentDetail?.student_details?.student_phone_no || '0000000000';
    let hashData =
      easebuzz_key +
      '|' +
      collect_request_id +
      '|' +
      amount.toString() +
      '|' +
      email +
      '|' +
      student_phone_no +
      '|' +
      easebuzz_salt;

    let hash = await calculateSHA512Hash(hashData);
    const qs = require('qs');

    const data = qs.stringify({
      txnid: collect_request_id,
      key: easebuzz_key,
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

    if (statusRes.msg === 'Hash mismatch') {
      const oldhashData =
        easebuzz_key +
        '|' +
        collect_request_id +
        '|' +
        amount.toString() +
        '|' +
        'noreply@edviron.com' +
        '|' +
        '9898989898' +
        '|' +
        easebuzz_salt;

      let oldhash = await calculateSHA512Hash(oldhashData);

      const olddata = qs.stringify({
        txnid: collect_request_id,
        key: easebuzz_key,
        amount: amount,
        email: 'noreply@edviron.com',
        phone: '9898989898',
        hash: oldhash,
      });

      const oldConfig = {
        method: 'POST',
        url: `https://dashboard.easebuzz.in/transaction/v1/retrieve`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        data: olddata,
      };

      const { data: statusRes } = await axios.request(oldConfig);
      return statusRes;
    }

    return statusRes;
  }

  async createOrderNonseamless(
    request: CollectRequest,
    platform_charges: platformChange[],
    school_name: string,
  ) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
      const { additional_data } = collectReq;
      const studentDetail = JSON.parse(additional_data);
      console.log('heree');
      if (request.isSplitPayments) {
        if (!request.easebuzz_split_label) {
          throw new BadRequestException(
            `Split Information Not Configure Please contact tarun.k@edviron.com`,
          );
        }

        const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
        const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
        const easebuzz_sub_merchant_id =
          request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
        // Easebuzz pg data
        let productinfo = 'payment gateway customer';
        let firstname =
          studentDetail.student_details?.student_name || 'customer';
        let email =
          studentDetail.student_details?.student_email || 'noreply@edviron.com';
        let student_id = studentDetail?.student_details?.student_id || 'N/A';
        let student_phone_no =
          studentDetail?.student_details?.student_phone_no || 'N/A';
        const additionalData = studentDetail.additional_fields || {};
 let topFiveData: any = [];
      if (request.additionalDataToggle) {
        topFiveData = Object.entries(additionalData).slice(0, 5);
      } else {
        topFiveData = Object.entries(additionalData).slice(0, 0);
      }
      const topFiveObject = Object.fromEntries(topFiveData);
        
        const udfValues = [
          student_id,
          student_phone_no,
          ...Object.values(topFiveObject),
        ];

        const udfPadded = [
          ...udfValues,
          ...new Array(Math.max(0, 10 - udfValues.length)).fill(''),
        ].slice(0, 10);

        const hashData = [
          easebuzz_key,
          request._id,
          parseFloat(request.amount.toFixed(2)),
          productinfo,
          firstname,
          email,
          ...udfPadded,
          easebuzz_salt,
        ].join('|');

        const easebuzz_cb_surl =
          process.env.URL +
          '/easebuzz/non-seamless/callback?collect_request_id=' +
          request._id +
          '&status=pass';

        const easebuzz_cb_furl =
          process.env.URL +
          '/easebuzz/non-seamless/callback?collect_request_id=' +
          request._id +
          '&status=fail';

        let hash = await calculateSHA512Hash(hashData);
        let encodedParams = new URLSearchParams();
        encodedParams.set(
          'key',
          request.easebuzz_non_partner_cred.easebuzz_key,
        );
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
        encodedParams.set('sub_merchant_id', easebuzz_sub_merchant_id);
        udfPadded.forEach((val, index) => {
          encodedParams.set(`udf${index + 1}`, val);
        });
        let ezb_split_payments: { [key: string]: number } = {};

        if (
          request.isSplitPayments &&
          request.easebuzzVendors &&
          request.easebuzz_split_label &&
          request.easebuzzVendors.length > 0
        ) {
          let vendorTotal = 0;
          for (const vendor of request.easebuzzVendors) {
            if (vendor.name && typeof vendor.amount === 'number') {
              ezb_split_payments[vendor.vendor_id] = vendor.amount;
              vendorTotal += vendor.amount;
            }

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

          const remainingAmount = request.amount - vendorTotal;
          // remainig balance will go to sub-merchant-id in split
          if (remainingAmount > 0) {
            ezb_split_payments[request.easebuzz_split_label] = remainingAmount;
          }
          encodedParams.set(
            'split_payments',
            JSON.stringify(ezb_split_payments),
          );
        }
        else {
          ezb_split_payments[request.easebuzz_split_label] = request.amount;
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

        const disabled_modes_string = request.disabled_modes
          .map((mode) => `${mode}=false`)
          .join('&');
        const encodedPlatformCharges = encodeURIComponent(
          JSON.stringify(platform_charges),
        );
        console.log(Ezboptions , "EzboptionsEzboptions")
        const { data: easebuzzRes } = await axios.request(Ezboptions);
        const easebuzzPaymentId = easebuzzRes.data;
        collectReq.paymentIds.easebuzz_id = easebuzzPaymentId;
        await collectReq.save();
        await this.getQr(request._id.toString(), request, ezb_split_payments); // uncomment after fixing easebuzz QR code issue
        setTimeout(
          () => {
            this.terminateNotInitiatedOrder(request._id.toString())
          },
          25 * 60 * 1000,
        )
        return {
          collect_request_id: request._id,
          collect_request_url: `${process.env.URL}/easebuzz/redirect?&collect_id=${request._id}&easebuzzPaymentId=${easebuzzPaymentId}`,
        };
      }
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async createOrderNonSplitNonSeamless(
    request: CollectRequest,
    platform_charges: platformChange[],
    school_name: string,
    easebuzz_school_label?: string | null,
  ) {
    try {
      console.log('11');

      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }

      console.log('debud');

      const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
      const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
      const easebuzz_sub_merchant_id =
        request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
      // Easebuzz pg data
      let productinfo = 'payment gateway customer';
      const { additional_data } = collectReq;
      const studentDetail = JSON.parse(additional_data);
      let firstname = (
        studentDetail.student_details?.student_name || 'customer'
      ).trim();
      let email =
        studentDetail.student_details?.student_email || 'noreply@edviron.com';
      let student_id = studentDetail?.student_details?.student_id || 'NA';
      let student_phone_no =
        studentDetail?.student_details?.student_phone_no || '0000000000';
      const additionalData = studentDetail.additional_fields || {};

       let topFiveData: any = [];
      if (request.additionalDataToggle) {
        topFiveData = Object.entries(additionalData).slice(0, 5);
      } else {
        topFiveData = Object.entries(additionalData).slice(0, 0);
      }
      const topFiveObject = Object.fromEntries(topFiveData);

     const udfValues = [
          student_id,
          student_phone_no,
          ...Object.values(topFiveObject),
        ];

        const udfPadded = [
          ...udfValues,
          ...new Array(Math.max(0, 10 - udfValues.length)).fill(''),
        ].slice(0, 10);

        const hashData = [
          easebuzz_key,
          request._id,
          parseFloat(request.amount.toFixed(2)),
          productinfo,
          firstname,
          email,
          ...udfPadded,
          easebuzz_salt,
        ].join('|');

      const easebuzz_cb_surl =
        process.env.URL +
        '/easebuzz/non-seamless/callback/?collect_request_id=' +
        request._id +
        '&status=pass';

      const easebuzz_cb_furl =
        process.env.URL +
        '/easebuzz/non-seamless/callback/?collect_request_id=' +
        request._id +
        '&status=fail';

      let hash = await calculateSHA512Hash(hashData);
      let encodedParams = new URLSearchParams();
      encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
      encodedParams.set('txnid', request._id.toString());
      encodedParams.set(
        'amount',
        parseFloat(request.amount.toFixed(2)).toString(),
      );

      encodedParams.set('productinfo', productinfo);
      encodedParams.set('firstname', firstname);
      encodedParams.set('phone', student_phone_no);
      encodedParams.set('email', email);
      encodedParams.set('surl', easebuzz_cb_surl);
      encodedParams.set('furl', easebuzz_cb_furl);
      encodedParams.set('hash', hash);
      encodedParams.set('request_flow', 'SEAMLESS');
      udfPadded.forEach((val, index) => {
          encodedParams.set(`udf${index + 1}`, val);
      });

      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      const encodedPlatformCharges = encodeURIComponent(
        JSON.stringify(platform_charges),
      );

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
      console.log(easebuzzRes, 'ressss');

      const easebuzzPaymentId = easebuzzRes.data;
      collectReq.paymentIds.easebuzz_id = easebuzzPaymentId;
      await collectReq.save();
      await this.getQrNonSplit(request._id.toString(), request); // uncomment after fixing easebuzz QR code issue
      setTimeout(
        () => {
          this.terminateNotInitiatedOrder(request._id.toString())
        },
        25 * 60 * 1000,
      )
      return {
        collect_request_id: request._id,
        collect_request_url: `${process.env.URL}/easebuzz/redirect?&collect_id=${request._id}&easebuzzPaymentId=${easebuzzPaymentId}`,
      };
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async createOrderSeamlessNonSplit(request: CollectRequest) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
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
      const easebuzzPaymentId = easebuzzRes.data;
      await this.getQrNonSplit(request._id.toString(), request); // uncomment after fixing easebuzz QR code issue
      setTimeout(
        () => {
          this.terminateNotInitiatedOrder(request._id.toString())
        },
        25 * 60 * 1000,
      )
      return easebuzzPaymentId;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async netBankingSeamless(collect_id: string, selectedBank: string) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectReq) {
        throw new BadRequestException('Invalid Collect Id');
      }

      const easebuzzPaymentId = collectReq.paymentIds.easebuzz_id;
      if (!easebuzzPaymentId) {
        throw new BadRequestException('Invalid Payment');
      }

      // Generate HTML form with auto-submit
      const htmlForm = `
     <script type="text/javascript">
        window.onload = function() {
          // Create a hidden form dynamically
          var form = document.createElement("form");
          form.method = "POST";
          form.action = "https://pay.easebuzz.in/initiate_seamless_payment/";

          var input1 = document.createElement("input");
          input1.type = "hidden";
          input1.name = "access_key";
          input1.value = "${easebuzzPaymentId}";
          form.appendChild(input1);

          var input2 = document.createElement("input");
          input2.type = "hidden";
          input2.name = "payment_mode";
          input2.value = "NB";
          form.appendChild(input2);

          var input3 = document.createElement("input");
          input3.type = "hidden";
          input3.name = "bank_code";
          input3.value = "${selectedBank}";
          form.appendChild(input3);

          document.body.appendChild(form);
          form.submit();
        }
      </script>

    `;

      // Return HTML so frontend browser can render it
      return htmlForm;
    } catch (e) {
      console.error(e);
      throw new BadRequestException(e.message);
    }
  }

  async encCard(merchant_id: string, pg_key: string, data: string) {
    try {
      const { key, iv } = await merchantKeyIv(merchant_id, pg_key);
      const end_data = await encryptCard(data, key, iv);
      return end_data;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async easebuzzEncryption(
    card_number: string,
    card_holder: string,
    card_cvv: string,
    card_exp: string,
    collect_id: string,
  ) {
    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new BadRequestException('Collect Request not found');
      }

      const { key, iv } = await merchantKeySHA256(request);
      const enc_card_number = await encryptCard(card_number, key, iv);
      const enc_card_holder = await encryptCard(card_holder, key, iv);
      const enc_card_cvv = await encryptCard(card_cvv, key, iv);
      const enc_card_exp = await encryptCard(card_exp, key, iv);

      return {
        card_number: enc_card_number,
        card_holder: enc_card_holder,
        card_cvv: enc_card_cvv,
        card_exp: enc_card_exp,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async processcards(
    card_number: string,
    card_holder_name: string,
    card_cvv: string,
    card_expiry_date: string,
  ) {
    try {
    } catch (e) { }
  }

  async createOrderSeamlessSplit(
    request: CollectRequest,
    // platform_charges: platformChange[],
    // school_name: string,
  ) {
    try {
      if (!request.easebuzz_split_label) {
        throw new BadRequestException(
          `Split Information Not Configure Please contact tarun.k@edviron.com`,
        );
      }

      const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
      const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
      const easebuzz_sub_merchant_id =
        request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
      // Easebuzz pg data
      let productinfo = 'payment gateway customer';
      let firstname = 'customer';
      let email = 'noreply@edviron.com';
      let hashData =
        easebuzz_key +
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
        easebuzz_salt;

      const easebuzz_cb_surl =
        process.env.URL +
        '/easebuzz/easebuzz-callback?collect_request_id=' +
        request._id +
        '&status=pass';

      const easebuzz_cb_furl =
        process.env.URL +
        '/easebuzz/easebuzz-callback?collect_request_id=' +
        request._id +
        '&status=fail';

      let hash = await calculateSHA512Hash(hashData);
      let encodedParams = new URLSearchParams();
      encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
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
      // encodedParams.set('sub_merchant_id', easebuzz_sub_merchant_id);
      let ezb_split_payments: { [key: string]: number } = {};

      if (
        request.isSplitPayments &&
        request.easebuzzVendors &&
        request.easebuzz_split_label &&
        request.easebuzzVendors.length > 0
      ) {
        let vendorTotal = 0;
        for (const vendor of request.easebuzzVendors) {
          if (vendor.name && typeof vendor.amount === 'number') {
            ezb_split_payments[vendor.vendor_id] = vendor.amount;
            vendorTotal += vendor.amount;
          }

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

        const remainingAmount = request.amount - vendorTotal;
        // remainig balance will go to sub-merchant-id in split
        if (remainingAmount > 0) {
          ezb_split_payments[request.easebuzz_split_label] = remainingAmount;
        }
        encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
      }
      // in case of split false 100% amount goes to sub merchant
      else {
        ezb_split_payments[request.easebuzz_split_label] = request.amount;
        encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
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

      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      // const encodedPlatformCharges = encodeURIComponent(
      //   JSON.stringify(platform_charges),
      // );

      const { data: easebuzzRes } = await axios.request(Ezboptions);
      console.log({ easebuzzRes });

      const easebuzzPaymentId = easebuzzRes.data;
      await this.getQrNonSplit(request._id.toString(), request);
      return easebuzzPaymentId;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createOrderV3(
    request: CollectRequest,
    platform_charges: platformChange[],
    school_name: string,
  ) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
      const { additional_data } = collectReq;
      if (request.isSplitPayments) {
        if (!request.easebuzz_split_label) {
          throw new BadRequestException(
            `Split Information Not Configure Please contact tarun.k@edviron.com`,
          );
        }
        const studentDetail = JSON.parse(additional_data);
        const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
        const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;

        const easebuzz_sub_merchant_id =
          request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
        // Easebuzz pg data
        let productinfo = 'payment gateway customer';
        let firstname =
          studentDetail.student_details?.student_name || 'customer';
        let email =
          studentDetail.student_details?.student_email || 'noreply@edviron.com';
        let student_id = studentDetail?.student_details?.student_id || 'NA';
        let student_phone_no =
          studentDetail?.student_details?.student_phone_no || 'NA';
        let hashData =
          easebuzz_key +
          '|' +
          request._id +
          '|' +
          parseFloat(request.amount.toFixed(2)) +
          '|' +
          productinfo +
          '|' +
          firstname +
          '|' +
          student_id +
          '|' +
          student_phone_no +
          '|' +
          email +
          '|||||||||||' +
          easebuzz_salt;

        const easebuzz_cb_surl =
          process.env.URL +
          '/easebuzz/easebuzz-callback?collect_request_id=' +
          request._id +
          '&status=pass';

        const easebuzz_cb_furl =
          process.env.URL +
          '/easebuzz/easebuzz-callback?collect_request_id=' +
          request._id +
          '&status=fail';

        let hash = await calculateSHA512Hash(hashData);
        let encodedParams = new URLSearchParams();
        encodedParams.set(
          'key',
          request.easebuzz_non_partner_cred.easebuzz_key,
        );
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
        encodedParams.set('udf1', student_id);
        encodedParams.set('udf2', student_phone_no);
        // encodedParams.set('sub_merchant_id', easebuzz_sub_merchant_id);
        let ezb_split_payments: { [key: string]: number } = {};

        if (
          request.isSplitPayments &&
          request.easebuzzVendors &&
          request.easebuzz_split_label &&
          request.easebuzzVendors.length > 0
        ) {
          let vendorTotal = 0;
          for (const vendor of request.easebuzzVendors) {
            if (vendor.name && typeof vendor.amount === 'number') {
              ezb_split_payments[vendor.vendor_id] = vendor.amount;
              vendorTotal += vendor.amount;
            }

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

          const remainingAmount = request.amount - vendorTotal;
          // remainig balance will go to sub-merchant-id in split
          if (remainingAmount > 0) {
            ezb_split_payments[request.easebuzz_split_label] = remainingAmount;
          }
          encodedParams.set(
            'split_payments',
            JSON.stringify(ezb_split_payments),
          );
        }
        // in case of split false 100% amount goes to sub merchant
        else {
          ezb_split_payments[request.easebuzz_split_label] = request.amount;
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

        const disabled_modes_string = request.disabled_modes
          .map((mode) => `${mode}=false`)
          .join('&');
        const encodedPlatformCharges = encodeURIComponent(
          JSON.stringify(platform_charges),
        );

        const { data: easebuzzRes } = await axios.request(Ezboptions);
        console.log({ easebuzzRes });

        const easebuzzPaymentId = easebuzzRes.data;
        setTimeout(
          () => {
            this.terminateNotInitiatedOrder(request._id.toString())
          },
          25 * 60 * 1000,
        )
        await this.getQr(request._id.toString(), request, ezb_split_payments); // uncomment after fixing easebuzz QR code issue
        return easebuzzPaymentId;
      }
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async createOrderV3NonSplit(
    request: CollectRequest,
    platform_charges: platformChange[],
    school_name: string,
    easebuzz_school_label?: string | null,
    isMasterGateway?: boolean,
  ) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect request not found');
      }
      const { additional_data } = collectReq;
      const studentDetail = JSON.parse(additional_data);
      console.log('debud');

      const easebuzz_key = request.easebuzz_non_partner_cred.easebuzz_key;
      const easebuzz_salt = request.easebuzz_non_partner_cred.easebuzz_salt;
      const easebuzz_sub_merchant_id =
        request.easebuzz_non_partner_cred.easebuzz_submerchant_id;
      // Easebuzz pg data
      console.log(studentDetail, 'ss');

      let productinfo = 'payment gateway customer';
      let firstname = (
        studentDetail.student_details?.student_name || 'customer'
      ).trim();
      let email =
        studentDetail.student_details?.student_email || 'noreply@edviron.com';
      let student_id = studentDetail?.student_details?.student_id || 'NA';
      let student_phone_no =
        studentDetail?.student_details?.student_phone_no || '0000000000';
      let hashData =
        easebuzz_key +
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
        '|' +
        student_id +
        '|' +
        student_phone_no +
        '|' +
        '||||||||' +
        easebuzz_salt;

      const easebuzz_cb_surl =
        process.env.URL +
        '/easebuzz/easebuzz-callback/?collect_request_id=' +
        request._id +
        '&status=pass';

      const easebuzz_cb_furl =
        process.env.URL +
        '/easebuzz/easebuzz-callback/?collect_request_id=' +
        request._id +
        '&status=fail';

      let hash = await calculateSHA512Hash(hashData);
      let encodedParams = new URLSearchParams();
      encodedParams.set('key', request.easebuzz_non_partner_cred.easebuzz_key);
      encodedParams.set('txnid', request._id.toString());
      encodedParams.set(
        'amount',
        parseFloat(request.amount.toFixed(2)).toString(),
      );

      encodedParams.set('productinfo', productinfo);
      encodedParams.set('firstname', firstname);
      encodedParams.set('phone', student_phone_no);
      encodedParams.set('email', email);
      encodedParams.set('surl', easebuzz_cb_surl);
      encodedParams.set('furl', easebuzz_cb_furl);
      encodedParams.set('hash', hash);
      encodedParams.set('request_flow', 'SEAMLESS');
      encodedParams.set('udf1', student_id);
      encodedParams.set('udf2', student_phone_no);
      // encodedParams.set('sub_merchant_id', easebuzz_sub_merchant_id);
      let ezb_split_payments: { [key: string]: number } = {};

      if (request.easebuzz_split_label) {
        ezb_split_payments[request.easebuzz_split_label] = request.amount;
        encodedParams.set('split_payments', JSON.stringify(ezb_split_payments));
      }

      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      const encodedPlatformCharges = encodeURIComponent(
        JSON.stringify(platform_charges),
      );

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
        
      const easebuzzPaymentId = easebuzzRes.data;
      await this.getQrNonSplit(request._id.toString(), request); // uncomment after fixing easebuzz QR code issue
      const schoolName = school_name.replace(/ /g, '_');

      setTimeout(
        () => {
          this.terminateNotInitiatedOrder(request._id.toString())
        },
        25 * 60 * 1000,
      )
      return easebuzzPaymentId;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

}
