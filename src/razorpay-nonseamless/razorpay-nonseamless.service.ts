import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import {
  CollectRequest,
  Gateway,
} from 'src/database/schemas/collect_request.schema';
import { formatRazorpayPaymentStatus } from 'src/hdfc_razporpay/hdfc_razorpay.service';
import { TransactionStatus } from 'src/types/transactionStatus';

@Injectable()
export class RazorpayNonseamlessService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrder(collectRequest: CollectRequest) {
    try {
      const {
        _id,
        amount: totalRupees,
        razorpay,
        razorpay_vendors_info,
      } = collectRequest;

      const totalPaise = Math.round(totalRupees * 100);
      const data: any = {
        amount: totalPaise,
        currency: 'INR',
        receipt: _id.toString(),
      };
      if (razorpay_vendors_info?.length) {
        let computed = 0;
        const transfers = razorpay_vendors_info.map((v, idx) => {
          let amtPaise: number;

          if (v.amount !== undefined) {
            amtPaise = Math.round(v.amount * 100);
          } else if (v.percentage !== undefined) {
            amtPaise = Math.floor((totalPaise * v.percentage) / 100);
          } else {
            throw new Error(
              `Vendor at index ${idx} must have amount or percentage`,
            );
          }

          computed += amtPaise;

          return {
            account: v.account || v.vendor_id,
            amount: amtPaise,
            currency: 'INR',
            notes: v.notes || {},
            linked_account_notes: v.linked_account_notes,
            on_hold: v.on_hold,
            on_hold_until: v.on_hold_until
              ? Math.floor(v.on_hold_until.getTime() / 1000)
              : undefined,
          };
        });

        const remainder = totalPaise - computed;
        if (remainder !== 0 && transfers.length > 0) {
          transfers[0].amount += remainder;
        }
        data.transfers = transfers;
      }
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.RAZORPAY_URL}/v1/orders`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: razorpay.razorpay_id,
          password: razorpay.razorpay_secret,
        },
        data,
      };
      const { data: rpRes } = await axios.request(config);
      if (rpRes.status !== 'created') {
        throw new BadRequestException('Failed to create Razorpay order');
      }
      await (collectRequest as any).constructor.updateOne(
        { _id },
        {
          $set: {
            gateway: Gateway.EDVIRON_RAZORPAY,
            'razorpay.order_id': rpRes.id,
          },
        },
      );

      return {
        url: `${process.env.URL}/razorpay-nonseamless/redirect?collect_id=${_id}`,
        collect_req: collectRequest,
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  async getPaymentStatus(order_id: string, collectRequest: CollectRequest) {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.RAZORPAY_URL}/v1/orders/${order_id}/payments`,
        headers: {
          'content-type': 'application/json',
        },
        auth: {
          username: collectRequest.razorpay.razorpay_id,
          password: collectRequest.razorpay.razorpay_secret,
        },
      };
      const { data: orderStatus } = await axios.request(config);
      const status = orderStatus?.items[0];
      return await this.formatRazorpayPaymentStatusResponse(
        status,
        collectRequest,
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  async formatRazorpayPaymentStatusResponse(
    response: any,
    collectRequest: CollectRequest,
  ) {
    try {
      const collectRequestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: collectRequest._id,
        });
      if (!collectRequestStatus) {
        throw new BadRequestException('Collect request not found');
      }
      const status = formatRazorpayPaymentStatus(response?.status);
      const statusCode =
        status === TransactionStatus.SUCCESS
          ? 200
          : status === TransactionStatus.FAILURE
          ? 400
          : 202;

      const formattedResponse: any = {
        status: status,
        amount: response?.amount ? response?.amount / 100 : null,
        transaction_amount: response?.amount ? response?.amount / 100 : null,
        status_code: statusCode,
        custom_order_id: collectRequest?.custom_order_id,
        details: {
          payment_mode: response?.method || null,
          payment_methods: {},
          transaction_time: response?.created_at
            ? new Date(response?.created_at * 1000).toISOString()
            : null,
          formattedTransactionDate: response?.created_at
            ? new Date(response?.created_at * 1000).toISOString().split('T')[0]
            : null,
          order_status:
            status === TransactionStatus.SUCCESS ? 'PAID' : 'PENDING',
          service_charge: response?.fee ? response?.fee / 100 : null,
        },
        capture_status: response?.captured || null,
      };

      if (response?.method === 'upi') {
        formattedResponse.details.payment_methods['upi'] = response?.upi;
        formattedResponse.details.bank_ref =
          response?.acquirer_data?.rrn || null;
      }
      if (response?.method === 'card') {
        const cardDetails = await this.fetchCardDetailsOfaPaymentFromRazorpay(
          response?.id,
          collectRequest,
        );
        formattedResponse.details.payment_mode = cardDetails?.type;
        formattedResponse.details.payment_methods['card'] = {
          card_bank_name: cardDetails?.card_issuer || null,
          card_country: cardDetails?.international ? null : 'IN',
          card_network: cardDetails?.network || null,
          card_number: `XXXXXXXXXXXX${cardDetails?.last4}` || null,
          card_sub_type: cardDetails?.card_type === 'CREDIT' ? 'P' : 'D',
          card_type: cardDetails?.type,
          channel: null,
        };
        formattedResponse.details.bank_ref =
          response?.acquirer_data?.rrn || null;
      }
      if (response?.method === 'netbanking') {
        formattedResponse.details.payment_mode = 'net_banking';
        formattedResponse.details.payment_methods['net_banking'] = {
          bank: response?.bank || null,
        };
        formattedResponse.details.bank_ref =
          response?.acquirer_data?.bank_transaction_id || null;
      }
      if (response?.method === 'wallet') {
        formattedResponse.details.payment_methods['wallet'] = {
          wallet: response?.wallet || null,
        };
        formattedResponse.details.bank_ref =
          response?.acquirer_data?.transaction_id || null;
      }
      return formattedResponse;
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  async fetchCardDetailsOfaPaymentFromRazorpay(
    payment_id: string,
    collectRequest: CollectRequest,
  ) {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.RAZORPAY_URL}/payments/${payment_id}/card`,
        auth: {
          username: collectRequest.razorpay.razorpay_id,
          password: collectRequest.razorpay.razorpay_secret,
        },
        headers: {
          'Content-Type': 'application/json',
          // 'X-Razorpay-Account': collectRequest.hdfc_razorpay_mid,
        },
      };
      const { data } = await axios.request(config);
      return data;
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }
}
