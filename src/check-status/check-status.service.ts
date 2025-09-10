import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  CollectRequest,
  Gateway,
} from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import mongoose from 'mongoose';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import * as moment from 'moment-timezone';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { PayUService } from 'src/pay-u/pay-u.service';
import { HdfcRazorpayService } from 'src/hdfc_razporpay/hdfc_razorpay.service';
import { SmartgatewayService } from 'src/smartgateway/smartgateway.service';
import { NttdataService } from 'src/nttdata/nttdata.service';
import { PosPaytmService } from 'src/pos-paytm/pos-paytm.service';
import { WorldlineService } from 'src/worldline/worldline.service';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';
import { GatepayService } from 'src/gatepay/gatepay.service';
@Injectable()
export class CheckStatusService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly hdfcService: HdfcService,
    private readonly phonePeService: PhonepeService,
    private readonly edvironPgService: EdvironPgService,
    private readonly ccavenueService: CcavenueService,
    private readonly easebuzzService: EasebuzzService,
    private readonly cashfreeService: CashfreeService,
    private readonly payUService: PayUService,
    private readonly hdfcRazorpay: HdfcRazorpayService,
    private readonly hdfcSmartgatewayService: SmartgatewayService,
    private readonly nttdataService: NttdataService,
    private readonly posPaytmService: PosPaytmService,
    private readonly worldlineService: WorldlineService,
    private readonly razorpayServiceModel: RazorpayNonseamlessService,
    private readonly gatepayService: GatepayService,
  ) {}
  async checkStatus(collect_request_id: String) {
    console.log('checking status for', collect_request_id);
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      );
    if (!collectRequest) {
      console.log('Collect request not found', collect_request_id);
      throw new NotFoundException('Collect request not found');
    }
    const custom_order_id = collectRequest.custom_order_id || null;
    const collect_req_status =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectRequest._id,
      });
    if (!collect_req_status) {
      console.log('Collect request status not found', collect_request_id);
      throw new NotFoundException('Collect request status not found');
    }

    if (collect_req_status.isAutoRefund) {
      const time =
        collect_req_status.payment_time || collect_req_status.updatedAt;
      const transaction_time = time.toISOString() as string;
      const date = new Date(transaction_time);
      const uptDate = moment(date);
      const istDate = uptDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
      return {
        status: TransactionStatus.FAILURE,
        amount: collect_req_status.order_amount,
        transaction_amount:
          collect_req_status.transaction_amount ||
          collect_req_status.order_amount,
        status_code: 400,
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
          order_status: TransactionStatus.FAILURE,
          isSettlementComplete: null,
          transfer_utr: null,
          service_charge: null,
        },
        custom_order_id,
      };
    }

    if (collectRequest.isVBAPaymentComplete) {
      let status_code = '400';
      if (collect_req_status.status.toUpperCase() === 'SUCCESS') {
        status_code = '200';
      }
      const details = {
        payment_mode: 'vba',
        bank_ref: collect_req_status.bank_reference || null,
        payment_methods: {
          vba: {
            channel: null,
            vba_account: collectRequest.vba_account_number || null,
          },
        },
        transaction_time: collect_req_status.payment_time,
        formattedTransactionDate: `${collect_req_status.payment_time.getFullYear()}-${String(
          collect_req_status.payment_time.getMonth() + 1,
        ).padStart(2, '0')}-${String(
          collect_req_status.payment_time.getDate(),
        ).padStart(2, '0')}`,
        order_status: 'PAID',
        isSettlementComplete: true,
        transfer_utr: null,
      };
      return {
        status: collect_req_status.status,
        amount: collectRequest.amount,
        transaction_amount: collect_req_status.transaction_amount,
        status_code,
        details: details,
        custom_order_id: collectRequest.custom_order_id || null,
      };
    }

    if (collectRequest.easebuzz_non_partner) {
      console.log('Checking status for easebuzz non-partner collect request');

      if (collectRequest.gateway === Gateway.EDVIRON_EASEBUZZ) {
        console.log('testing easebuzz status response v2');
        
        const easebuzzStatus = await this.easebuzzService.statusResponsev2(
          collect_request_id.toString(),
          collectRequest,
        );

        let status_code;
        if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
          status_code = 200;
        } else if (easebuzzStatus.msg.status.toUpperCase() === 'PREINITIATED') {
          easebuzzStatus.msg.status = 'NOT INITIATED';
          status_code = 202;
        } else {
          status_code = 400;
        }
        const date =
          collect_req_status.payment_time || collect_req_status.updatedAt;
        if (!date) {
          throw new Error('No date found in the transaction status');
        }
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          status_code,
          custom_order_id,
          amount: parseInt(easebuzzStatus.msg.amount),
          details: {
            payment_mode: collect_req_status.payment_time,
            bank_ref: easebuzzStatus.msg.bank_ref_num,
            payment_method: { mode: easebuzzStatus.msg.mode },
            transaction_time: collect_req_status?.updatedAt,
            formattedTransactionDate: `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            order_status: easebuzzStatus.msg.status,
          },
        };
        return ezb_status_response;
      }
      return await this.checkExpiry(collectRequest);
    }

    switch (collectRequest?.gateway) {
      case Gateway.HDFC:
        return await this.hdfcService.checkStatus(collect_request_id);
      case Gateway.PHONEPE:
        return await this.phonePeService.checkStatus(collect_request_id);
      case Gateway.EDVIRON_PG:
        let edvironPgResponse;
        if (collectRequest.cashfree_non_partner) {
          edvironPgResponse = await this.cashfreeService.checkStatusV2(
            collect_request_id.toString(),
          );
        } else {
          edvironPgResponse = await this.edvironPgService.checkStatus(
            collect_request_id,
            collectRequest,
          );
        }
        return {
          ...edvironPgResponse,
          custom_order_id: collectRequest.custom_order_id || null,
          capture_status: collect_req_status.capture_status || 'PENDING',
        };

      case Gateway.SMART_GATEWAY:
        const data = await this.hdfcSmartgatewayService.checkStatus(
          collectRequest._id.toString(),
          collectRequest,
        );
        return data;

      case Gateway.EDVIRON_GATEPAY:
        const gatepay_data = await this.gatepayService.getPaymentStatus(
          collectRequest._id.toString(),
          collectRequest,
        );
        return gatepay_data;

      case Gateway.EDVIRON_RAZORPAY:
        const razorpayData = await this.razorpayServiceModel.getPaymentStatus(
          collectRequest.razorpay.order_id.toString(),
          collectRequest,
        );
        return razorpayData;

      case Gateway.EDVIRON_EASEBUZZ:
        console.log('testing easebuzz status response');

        const easebuzzStatus = await this.easebuzzService.statusResponse(
          collect_request_id.toString(),
          collectRequest,
        );
        let status_code;
        if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
          status_code = 200;
        } else {
          status_code = 400;
        }
        const date =
          collect_req_status.payment_time || collect_req_status.updatedAt;
        if (!date) {
          throw new Error('No date found in the transaction status');
        }
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          status_code,
          custom_order_id,
          amount: parseInt(easebuzzStatus.msg.amount),
          details: {
            payment_mode: collect_req_status.payment_time,
            bank_ref: easebuzzStatus.msg.bank_ref_num,
            payment_method: { mode: easebuzzStatus.msg.mode },
            transaction_time: collect_req_status?.updatedAt,
            formattedTransactionDate: `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            order_status: easebuzzStatus.msg.status,
          },
        };
        return ezb_status_response;
      case Gateway.EDVIRON_CCAVENUE:
        if (collectRequest.school_id === '6819e115e79a645e806c0a70') {
          return await this.ccavenueService.checkStatusProd(
            collectRequest,
            collect_request_id.toString(),
          );
        }
        const res = await this.ccavenueService.checkStatus(
          collectRequest,
          collect_request_id.toString(),
          // collectRequest.ccavenue_access_code,
        );
        let status_codes;
        if (res.status.toUpperCase() === TransactionStatus.SUCCESS) {
          status_codes = 200;
        } else {
          status_codes = 400;
        }
        const order_info = JSON.parse(res.decrypt_res);
        const status_response = {
          status: res.status,
          status_code: status_codes,
          custom_order_id,
          amount: res.amount,
          details: {
            transaction_time: res.transaction_time,
            payment_methods: res.paymentInstrument,
            order_status: order_info.Order_Status_Result.order_bank_response,
          },
        };
        return status_response;
      case Gateway.EDVIRON_PAY_U:
        return await this.payUService.checkStatus(
          collectRequest._id.toString(),
        );

      case Gateway.EDVIRON_HDFC_RAZORPAY:
        const EDVIRON_HDFC_RAZORPAY =
          await this.hdfcRazorpay.checkPaymentStatus(
            collect_request_id.toString(),
            collectRequest,
          );

        let order_status = '';
        if (EDVIRON_HDFC_RAZORPAY.status.toUpperCase() === 'SUCCESS') {
          order_status = 'SUCCESS';
        } else {
          order_status = 'PENDING';
        }

        let statusCode;
        if (EDVIRON_HDFC_RAZORPAY.status.toUpperCase() === 'SUCCESS') {
          statusCode = 200;
        } else {
          statusCode = 400;
        }
        const Updateddate = EDVIRON_HDFC_RAZORPAY.details.transaction_time;
        if (!Updateddate) {
          throw new Error('No date found in the transaction status');
        }
        const ehr_status_response = {
          status: order_status.toUpperCase(),
          statusCode,
          custom_order_id,
          amount: parseInt(EDVIRON_HDFC_RAZORPAY?.amount),
          details: {
            payment_mode: EDVIRON_HDFC_RAZORPAY?.details?.payment_method,
            bank_ref: EDVIRON_HDFC_RAZORPAY.details.bank_ref,
            payment_method: {
              mode: EDVIRON_HDFC_RAZORPAY?.details?.payment_mode,
              method: EDVIRON_HDFC_RAZORPAY?.details?.payment_methods,
            },
            transaction_time: Updateddate,
            formattedTransactionDate: `${new Date(
              Updateddate,
            ).getFullYear()}-${String(
              new Date(Updateddate).getMonth() + 1,
            ).padStart(2, '0')}-${String(
              new Date(Updateddate).getDate(),
            ).padStart(2, '0')}`,
            order_status: EDVIRON_HDFC_RAZORPAY.status,
          },
        };
        return ehr_status_response;

      case Gateway.EDVIRON_NTTDATA:
        console.log('checking status for NTTDATA', collect_request_id);
        return await this.nttdataService.getTransactionStatus(
          collect_request_id.toString(),
        );

      case Gateway.EDVIRON_WORLDLINE:
        console.log(
          'checking status for EDVIRON_WORLDLINE',
          collect_request_id,
        );
        return await this.worldlineService.getStatus(
          collect_request_id.toString(),
        );

      case Gateway.PENDING:
        return await this.checkExpiry(collectRequest);
      case Gateway.PAYTM_POS:
        return await this.posPaytmService.formattedStatu(
          collectRequest._id.toString(),
        );
      case Gateway.EXPIRED:
        return {
          status: PaymentStatus.USER_DROPPED,
          custom_order_id,
          amount: collectRequest.amount,
          status_code: 202,
        };
    }
  }

  async checkStatusByOrderId(order_id: String, school_id: string) {
    console.log('checking status for custom order id', order_id);
    const collectRequest =
      await this.databaseService.CollectRequestModel.findOne({
        custom_order_id: order_id,
        school_id,
      });
    if (!collectRequest) {
      console.log('Collect request not found', order_id);
      throw new NotFoundException('Collect request not found');
    }
    const collect_req_status =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectRequest._id,
      });

    if (!collect_req_status) {
      console.log('No status found for custom order id', order_id);
      throw new NotFoundException('No status found for custom order id');
    }

    const collectidString = collectRequest._id.toString();
    if (collectRequest.isVBAPaymentComplete) {
      let status_code = '400';
      if (collect_req_status.status.toUpperCase() === 'SUCCESS') {
        status_code = '200';
      }
      const details = {
        payment_mode: 'vba',
        bank_ref: collect_req_status.bank_reference || null,
        payment_methods: {
          vba: {
            channel: null,
            vba_account: collectRequest.vba_account_number || null,
          },
        },
        transaction_time: collect_req_status.payment_message,
        formattedTransactionDate: `${collect_req_status.payment_time.getFullYear()}-${String(
          collect_req_status.payment_time.getMonth() + 1,
        ).padStart(2, '0')}-${String(
          collect_req_status.payment_time.getDate(),
        ).padStart(2, '0')}`,
        order_status: 'PAID',
        isSettlementComplete: true,
        transfer_utr: null,
      };
      return {
        status: collect_req_status.status,
        amount: collectRequest.amount,
        transaction_amount: collect_req_status.transaction_amount,
        status_code,
        details: details,
        custom_order_id: collectRequest.custom_order_id || null,
      };
    }
    if (collectRequest.easebuzz_non_partner) {
      console.log('Checking status for easebuzz non-partner collect request');

      if (collectRequest.gateway === Gateway.EDVIRON_EASEBUZZ) {
        const easebuzzStatus = await this.easebuzzService.statusResponsev2(
          collectidString,
          collectRequest,
        );

        let status_code;
        if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
          status_code = 200;
        } else if (easebuzzStatus.msg.status.toUpperCase() === 'PREINITIATED') {
          easebuzzStatus.msg.status = 'NOT INITIATED';
          status_code = 202;
        } else {
          status_code = 400;
        }
        const date =
          collect_req_status.payment_time || collect_req_status.updatedAt;
        if (!date) {
          throw new Error('No date found in the transaction status');
        }
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          status_code,
          custom_order_id: collectRequest.custom_order_id || null,
          amount: parseInt(easebuzzStatus.msg.amount),
          details: {
            payment_mode: collect_req_status.payment_time,
            bank_ref: easebuzzStatus.msg.bank_ref_num,
            payment_method: { mode: easebuzzStatus.msg.mode },
            transaction_time: collect_req_status?.updatedAt,
            formattedTransactionDate: `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            order_status: easebuzzStatus.msg.status,
          },
        };
        return ezb_status_response;
      }
      return await this.checkExpiry(collectRequest);
    }
    switch (collectRequest?.gateway) {
      case Gateway.HDFC:
        return await this.hdfcService.checkStatus(
          collectRequest._id.toString(),
        );
      case Gateway.PHONEPE:
        return await this.phonePeService.checkStatus(
          collectRequest._id.toString(),
        );
      case Gateway.EDVIRON_PG:
        let edvironPgResponse;
        if (collectRequest.cashfree_non_partner) {
          console.log('checking for non p');
          edvironPgResponse = await this.cashfreeService.checkStatusV2(
            collectRequest._id.toString(),
          );
        } else {
          edvironPgResponse = await this.edvironPgService.checkStatus(
            collectRequest._id.toString(),
            collectRequest,
          );
        }
        return {
          ...edvironPgResponse,
          edviron_order_id: collectRequest._id,
          custom_order_id: collectRequest.custom_order_id || null,
          capture_status: collect_req_status.capture_status || 'PENDING',
        };

      case Gateway.EDVIRON_RAZORPAY:
        const razorpayData = await this.razorpayServiceModel.getPaymentStatus(
          collectRequest.razorpay.order_id.toString(),
          collectRequest,
        );
        return razorpayData;

      case Gateway.SMART_GATEWAY:
        const data = await this.hdfcSmartgatewayService.checkStatus(
          collectRequest._id.toString(),
          collectRequest,
        );
        return data;

      case Gateway.EDVIRON_GATEPAY:
        const gatepay_data = await this.gatepayService.getPaymentStatus(
          collectRequest._id.toString(),
          collectRequest,
        );
        return gatepay_data;

      case Gateway.EDVIRON_WORLDLINE:
        console.log(
          'checking status for EDVIRON_WORLDLINE',
          collectRequest._id.toString(),
        );
        return await this.worldlineService.getStatus(
          collectRequest._id.toString(),
        );

      case Gateway.EDVIRON_EASEBUZZ:
        const easebuzzStatus = await this.easebuzzService.statusResponse(
          collectidString,
          collectRequest,
        );
        let status_code;
        if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
          status_code = 200;
        } else {
          status_code = 400;
        }
        const date = collect_req_status.updatedAt;
        if (!date) {
          throw new Error('No date found in the transaction status');
        }
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          status_code,
          edviron_order_id: collectRequest._id.toString(),
          amount: parseInt(easebuzzStatus.msg.amount),
          details: {
            bank_ref: easebuzzStatus.msg.bank_ref_num,
            payment_method: { mode: easebuzzStatus.msg.mode },
            transaction_time: collect_req_status?.updatedAt,
            formattedTransactionDate: `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            order_status: easebuzzStatus.msg.status,
          },
        };
        return ezb_status_response;
      case Gateway.PAYTM_POS:
        return await this.posPaytmService.formattedStatu(
          collectRequest._id.toString(),
        );
      case Gateway.EDVIRON_CCAVENUE:
        if (collectRequest.school_id === '6819e115e79a645e806c0a70') {
          return await this.ccavenueService.checkStatusProd(
            collectRequest,
            collectidString,
          );
        }
        const res = await this.ccavenueService.checkStatus(
          collectRequest,
          collectidString,
          // collectRequest.ccavenue_access_code,
        );
        const order_info = JSON.parse(res.decrypt_res);
        let status_codes;
        if (res.status.toUpperCase() === TransactionStatus.SUCCESS) {
          status_codes = 200;
        } else {
          status_codes = 400;
        }
        const status_response = {
          status: res.status,
          edviron_order_id: collectRequest._id.toString(),
          status_code: status_codes,
          amount: res.amount,
          details: {
            transaction_time: res.transaction_time,
            payment_methods: res.paymentInstrument,
            order_status: order_info.Order_Status_Result.order_bank_response,
          },
        };
        return status_response;
      case Gateway.EDVIRON_PAY_U:
        return await this.payUService.checkStatus(
          collectRequest._id.toString(),
        );
      case Gateway.EDVIRON_NTTDATA:
        return await this.nttdataService.getTransactionStatus(
          collectRequest.toString(),
        );
      case Gateway.PENDING:
        return await this.checkExpiry(collectRequest);
      case Gateway.EXPIRED:
        return {
          status: PaymentStatus.USER_DROPPED,
          edviron_order_id: collectRequest._id.toString(),
          amount: collectRequest.amount,
          status_code: 202,
        };
    }
  }

  async checkExpiry(request: CollectRequest) {
    const createdAt = request.createdAt; // Convert createdAt to a Date object
    const currentTime = new Date(); // Get the current time
    if (!createdAt) {
      return 'Invalid request';
    }
    // Calculate the time difference in milliseconds
    const timeDifference = currentTime.getTime() - createdAt.getTime();

    // Convert milliseconds to minutes
    const differenceInMinutes = timeDifference / (1000 * 60);
    const requestStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: request._id,
      });
    let paymentStatus: any = PaymentStatus.USER_DROPPED;
    if (requestStatus) {
      paymentStatus = requestStatus.status;
    }
    // Check if the difference is more than 20 minutes
    if (differenceInMinutes > 25) {
      return {
        status: paymentStatus,
        custom_order_id: request.custom_order_id || 'NA',
        amount: request.amount,
        status_code: 202,
      };
    } else {
      return {
        status: 'NOT INITIATED',
        custom_order_id: request.custom_order_id || 'NA',
        amount: request.amount,
        status_code: 202,
      };
    }
  }

  async checkStatusV2(collect_request_id: String) {
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      );
    if (!collectRequest) {
      throw new NotFoundException('Collect request not found');
    }
    const custom_order_id = collectRequest.custom_order_id || null;
    const collect_req_status =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectRequest._id,
      });
    if (!collect_req_status) {
      throw new NotFoundException('Collect request status not found');
    }

    if (collect_req_status.isAutoRefund) {
      const time =
        collect_req_status.payment_time || collect_req_status.updatedAt;
      const transaction_time = time.toISOString() as string;
      const date = new Date(transaction_time);
      const uptDate = moment(date);
      const istDate = uptDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
      return {
        status: TransactionStatus.FAILURE,
        amount: collect_req_status.order_amount,
        transaction_amount:
          collect_req_status.transaction_amount ||
          collect_req_status.order_amount,
        status_code: 400,
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
          order_status: TransactionStatus.FAILURE,
          isSettlementComplete: null,
          transfer_utr: null,
          service_charge: null,
        },
        custom_order_id,
      };
    }

    switch (collectRequest?.gateway) {
      case Gateway.HDFC:
        return await this.hdfcService.checkStatus(collect_request_id);
      case Gateway.PHONEPE:
        return await this.phonePeService.checkStatus(collect_request_id);
      case Gateway.EDVIRON_PG:
        const edvironPgResponse = await this.edvironPgService.checkStatus(
          collect_request_id,
          collectRequest,
        );
        return {
          ...edvironPgResponse,
          custom_order_id,
          capture_status: collect_req_status.capture_status || 'PENDING',
        };

      case Gateway.EDVIRON_EASEBUZZ:
        const easebuzzStatus = await this.easebuzzService.statusResponse(
          collect_request_id.toString(),
          collectRequest,
        );
        let status_code;
        if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
          status_code = 200;
        } else {
          status_code = 400;
        }
        const date = collect_req_status.updatedAt;
        if (!date) {
          throw new Error('No date found in the transaction status');
        }
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          status_code,
          custom_order_id,
          amount: parseInt(easebuzzStatus.msg.amount),
          details: {
            payment_mode: collect_req_status.payment_method,
            bank_ref: easebuzzStatus.msg.bank_ref_num,
            payment_method: { mode: easebuzzStatus.msg.mode },
            transaction_time: collect_req_status?.updatedAt,
            formattedTransactionDate: `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            order_status: easebuzzStatus.msg.status,
          },
        };
        return ezb_status_response;
      case Gateway.EDVIRON_CCAVENUE:
        const res = await this.ccavenueService.checkStatus(
          collectRequest,
          collect_request_id.toString(),
          // collectRequest.ccavenue_access_code,
        );
        let status_codes;
        if (res.status.toUpperCase() === TransactionStatus.SUCCESS) {
          status_codes = 200;
        } else {
          status_codes = 400;
        }
        const order_info = JSON.parse(res.decrypt_res);
        const status_response = {
          status: res.status,
          status_code: status_codes,
          custom_order_id,
          amount: res.amount,
          details: {
            transaction_time: res.transaction_time,
            payment_methods: res.paymentInstrument,
            order_status: order_info.Order_Status_Result.order_bank_response,
          },
        };
        return status_response;
      case Gateway.PENDING:
        return await this.checkExpiry(collectRequest);
      case Gateway.EXPIRED:
        return {
          status: PaymentStatus.USER_DROPPED,
          custom_order_id,
          amount: collectRequest.amount,
          status_code: 202,
        };
    }
  }
}
