import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as crypto from 'crypto';
import axios from 'axios';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { TransactionStatus } from 'src/types/transactionStatus';

export const formatRazorpayPaymentStatus = (
  status: string,
): TransactionStatus => {
  const statusMap: Record<string, TransactionStatus> = {
    created: TransactionStatus.PENDING,
    authorized: TransactionStatus.PENDING,
    captured: TransactionStatus.SUCCESS,
    failed: TransactionStatus.FAILURE,
  };
  return statusMap[status] ?? TransactionStatus.PENDING;
};

@Injectable()
export class HdfcRazorpayService {
  private readonly API_URL = process.env.HDFC_RAZORPAY_URL;

  constructor(private readonly databaseService: DatabaseService) {}

  async verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string,
  ) {
    const body = `${orderId}|${paymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret ?? '')
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  async createOrder(request: CollectRequest) {
    try {
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${this.API_URL}/orders`,
        auth: {
          username: request.hdfc_razorpay_id ?? '',
          password: request.hdfc_razorpay_secret ?? '',
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': request.hdfc_razorpay_mid ?? '',
        },
        data: {
          amount: request.amount * 100,
          currency: 'INR',
          receipt: request._id,
        },
      };
      const { data } = await axios.request(config);
      return data;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  async checkPaymentStatus(paymentId: string, collectRequest: CollectRequest) {
    const rzp_payment_id = await this.databaseService.CollectRequestModel.findById(collectRequest._id)
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${this.API_URL}/payments/${rzp_payment_id?.hdfc_razorpay_payment_id}`,
        auth: {
          username: collectRequest.hdfc_razorpay_id ?? '',
          password: collectRequest.hdfc_razorpay_secret ?? '',
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': collectRequest.hdfc_razorpay_mid,
        },
      };
      const { data: paymentStatus } = await axios.request(config);
      const formattedStatus = await this.formatRazorpayPaymentStatusResponse(
        paymentStatus,
        collectRequest,
      );
      console.log(formattedStatus, "format")
      return formattedStatus;
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  async checkOrderStatus(collectId: string, collectRequest: CollectRequest) {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${this.API_URL}/orders?receipt=${collectId}`,
        auth: {
          username: collectRequest.hdfc_razorpay_id ?? '',
          password: collectRequest.hdfc_razorpay_secret ?? '',
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': collectRequest.hdfc_razorpay_mid ?? '',
        },
      };

      const { data: orderStatus } = await axios.request(config);
      const status = orderStatus?.items[0];
      return await this.formatRazorpayPaymentStatusResponse(
        status,
        collectRequest,
      );
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
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
        // console.log(collectRequestStatus)
      if (!collectRequestStatus) {
        throw new BadRequestException('Collect request not found');
      }
      // {
      //   id: 'pay_QM04WMmlC7EXzw',
      //   entity: 'payment',
      //   amount: 100,
      //   amount_captured: null,
      //   currency: 'INR',
      //   status: 'captured',
      //   order_id: 'order_QM04F9VsZMFgsY',
      //   invoice_id: null,
      //   international: false,
      //   method: 'upi',
      //   amount_refunded: 0,
      //   refund_status: null,
      //   captured: true,
      //   description: null,
      //   card_id: null,
      //   bank: null,
      //   wallet: null,
      //   vpa: 'manishhdfcacc@ybl',
      //   email: 'testing@email.com',
      //   contact: '+919090909090',
      //   notes: [],
      //   fee: 0,
      //   tax: 0,
      //   error_code: null,
      //   error_description: null,
      //   error_source: null,
      //   error_step: null,
      //   error_reason: null,
      //   acquirer_data: { rrn: '049384820790', upi_transaction_id: '131524376942' },
      //   created_at: 1745302389,
      //   provider: null,
      //   upi: {
      //     payer_account_type: 'bank_account',
      //     vpa: 'manishhdfcacc@ybl',
      //     flow: null
      //   },
      //   reward: null,
      //   flow: null,
      //   authorized_at: 1745302426,
      //   auto_captured: true,
      //   captured_at: 1745302427,
      //   late_authorized: false
      // } resp
console.log(response, "resp")
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
        transaction_amount: collectRequestStatus?.transaction_amount,
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

      console.log(formattedResponse, "formattedResponse")
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
        url: `${this.API_URL}/payments/${payment_id}/card`,
        auth: {
          username: collectRequest.hdfc_razorpay_id ?? '',
          password: collectRequest.hdfc_razorpay_secret ?? '',
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': collectRequest.hdfc_razorpay_mid,
        },
      };
      const { data } = await axios.request(config);
      return data;
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }
}
