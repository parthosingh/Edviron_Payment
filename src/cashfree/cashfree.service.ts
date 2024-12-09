import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import {
  CollectRequest,
  Gateway,
} from 'src/database/schemas/collect_request.schema';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import * as moment from 'moment-timezone';
@Injectable()
export class CashfreeService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => EdvironPgService))
    private readonly edvironPgService: EdvironPgService,
  ) {}
  async initiateRefund(refund_id: string, amount: number, collect_id: string) {
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new Error('Collect Request not found');
    }
    console.log('initiating refund with cashfree');

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
      console.log(response.data);

      return response.data;
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
    request.gateway = Gateway.EDVIRON_PG;
    await request.save();
    console.log(`Terminating ${collect_id}`);

    const { status } = await this.checkStatus(collect_id, request);

    if (status.toUpperCase() === 'SUCCESS') {
      throw new Error('Transaction already successful. Cannot terminate.');
    }

    let config = {
      method: 'patch',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': request.clientId,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
      data: { order_status: 'TERMINATED' },
    };

    try {
      const response = await axios.request(config);
      return response.data;
    } catch (e) {
      console.log(e.message);
      throw new BadRequestException(e.message);
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

  async getTransactionForSettlements(
    utr: string,
    client_id: string,
    limit: number,
    cursor: string | null,
  ) {
    try {
      const data = {
        pagination: {
          limit: limit,
          cursor,
        },
        filters: {
          settlement_utrs: [utr],
        },
      };
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.CASHFREE_ENDPOINT}/pg/settlement/recon`,
        headers: {
          accept: 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data,
      };

      const { data: response } = await axios.request(config);
      const orderIds = response.data.map((order: any) => order.order_id);

      const customOrders = await this.databaseService.CollectRequestModel.find({
        _id: { $in: orderIds },
      });
      // const customOrderMap = new Map(
      //   customOrders.map((doc) => [doc._id.toString(), doc.custom_order_id]),
      // );

      const customOrderMap = new Map(
        customOrders.map((doc) => [
          doc._id.toString(),
          {
            custom_order_id: doc.custom_order_id,
            school_id: doc.school_id,
            additional_data: doc.additional_data,
          },
        ]),
      );

      // const enrichedOrders = response.data.map((order: any) => ({
      //   ...order,
      //   custom_order_id: customOrderMap.get(order.order_id) || null,
      //   school_id: customOrderMap.get(order.school_id) || null,
      //   // student_id: customOrderMap.get(JSON.parse(order.additional_data.student_details.student_id)) || null,
      // }));

      const enrichedOrders = response.data.map((order: any) => {
        const customData: any = customOrderMap.get(order.order_id) || {};

        return {
          ...order,
          custom_order_id: customData.custom_order_id || null,
          school_id: customData.school_id || null,
          student_id:
            JSON.parse(customData.additional_data).student_details.student_id ||
            null,
          student_name:
            JSON.parse(customData.additional_data).student_details
              .student_name || null,
          student_email:
            JSON.parse(customData.additional_data).student_details
              .student_email || null,
          student_phone_no:
            JSON.parse(customData.additional_data).student_details
              .student_phone_no || null,
        };
      });

      return {
        cursor: response.cursor,
        limit: response.limit,
        settlements_transactions: enrichedOrders,
      };
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async getUpiPaymentInfoUrl(collect_id: string) {
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new BadRequestException('Collect Request not found');
    }

    // request.gateway=Gateway.EDVIRON_PG
    await request.save();
    const cashfreeId = request.paymentIds.cashfree_id;
    if (!cashfreeId) {
      throw new BadRequestException('Error in Getting QR Code');
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
          await this.terminateOrder(collect_id);
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

  async settlementStatus(collect_id: string, client_id: string) {
    try {
      const CollectRequestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id,
        });
      if (!CollectRequestStatus) {
        throw new BadRequestException('Settlement status not found');
      }
      const { transaction_amount, order_amount } = CollectRequestStatus;

      const taxes: Number = Number(transaction_amount) - Number(order_amount);
      const config = {
        method: 'get',
        url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/settlements`,
        headers: {
          accept: 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
      };
      try{

        const response = await axios(config);
        const settlement_info = response.data;
        if (settlement_info.transfer_utr) {
          return {
            isSettlementComplete: true,
            transfer_utr: settlement_info.transfer_utr,
            service_charge: taxes,
          };
        }
      }catch(e){
        console.log(e.message);
      }
      return {
        isSettlementComplete: false,
        transfer_utr:null,
        service_charge: taxes,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
