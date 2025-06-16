import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { DatabaseService } from 'src/database/database.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
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
            account: v.account,
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

  async refund(collect_id: string, refundAmount: number, refund_id: string) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);

      if (!collectRequest) {
        throw new BadRequestException(
          'CollectRequest with ID ' + collect_id + ' not found.',
        );
      }
      if (refundAmount > collectRequest.amount) {
        throw new BadRequestException(
          'Refund amount cannot be greater than the original amount.',
        );
      }
      const status = await this.getPaymentStatus(
        collectRequest.razorpay.order_id,
        collectRequest,
      );
      console.log(status, 'status');
      if (status.status !== 'SUCCESS') {
        throw new BadRequestException('Payment not captured yet.');
      }

      const totalPaise = Math.round(refundAmount * 100);
      const config = {
        method: 'post',
        url: `${process.env.RAZORPAY_URL}/v1/payments/${collectRequest.razorpay.payment_id}/refund`,
        headers: {
          'Content-Type': 'application/json',
        },
        auth: {
          username: collectRequest.razorpay.razorpay_id,
          password: collectRequest.razorpay.razorpay_secret,
        },
        data: {
          amount: totalPaise,
        },
      };
      const response = await axios.request(config);
      console.log(response.data, 'refund response');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Razorpay Refund Error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw new BadGatewayException(error.response?.data || error.message);
      }
      console.error('Internal Error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async fetchAndStoreAll(
    authId: string,
    authSecret: string,
    school_id: string,
    trustee_id: string,
    params: Record<string, any>,
    razorpay_mid?: string,
  ) {
    console.log('[FETCH START] Beginning pagination', {
      initialParams: params,
    });

    let allOrders: any[] = [];
    let skip = params.skip || 0;
    const pageSize = Math.min(params.count || 100, 100);
    let page = 1;

    while (true) {
      console.log(
        `[PAGE ${page}] Requesting page | skip=${skip} count=${pageSize}`,
      );

      const response = await this.fetchOrdersPage(
        authId,
        authSecret,
        pageSize,
        skip,
        params,
      );

      const orders = response.items || response;
      const receivedCount = orders?.length || 0;
      console.log(`[PAGE ${page}] Received ${receivedCount} orders`);

      if (!orders || receivedCount === 0) {
        console.log(`[PAGE ${page}] Empty page - stopping pagination`);
        break;
      }

      allOrders = [...allOrders, ...orders];
      skip += receivedCount;
      page++;

      if (receivedCount < pageSize) {
        console.log(
          `[PAGE ${
            page - 1
          }] Received less than page size (${receivedCount} < ${pageSize}) - stopping pagination`,
        );
        break;
      }
    }

    console.log(`[FETCH COMPLETE] Total orders fetched: ${allOrders.length}`);

    console.log('[PAYMENTS] Starting payment details fetch');

    const notfound = [];
    for (const order of allOrders) {
      const response = await this.retriveRazorpay(authId, authSecret, order.id);
      const payment = response;
      if (response.length === 0) {
        notfound.push(order.id);
        continue;
      }

      const studentDetail = {
        student_details: {
          student_id: 'N/A',
          student_email: payment.email || 'N/A',
          student_name: payment.description || 'N/A',
          student_phone_no: payment.contact || 'N/A',
          additional_fields: {},
        },
      };

      const collectRequest = new this.databaseService.CollectRequestModel({
        amount: payment.amount / 100, // Razorpay amount is in paise
        gateway: Gateway.EDVIRON_RAZORPAY,
        razorpay: {
          razorpay_id : authId,
          razorpay_secret : authSecret,
          order_id : order.id,
          payment_id : payment.id,
          razorpay_mid : razorpay_mid || ""
        }, 
        custom_order_id: order.receipt,
        additional_data: JSON.stringify(studentDetail),
        school_id: school_id,
        trustee_id: trustee_id,
      });

      let platform_type = '';
      let payment_method = '';
      let details: any = {};

      switch (payment.method) {
        case 'upi':
          payment_method = 'upi';
          platform_type = 'UPI';
          details = {
            app: {
              channel: payment.upi?.payer_account_type || 'NA',
              upi_id: payment.vpa || 'N/A',
            },
          };
          break;

        case 'card':
          payment_method =
            payment.card?.type === 'credit' ? 'crebit_card' : 'debit_card';
          platform_type =
            payment.card?.type === 'credit' ? 'CreditCard' : 'DebitCard';
          details = {
            card: {
              card_bank_name: payment.card?.issuer || 'NA',
              card_network: payment.card?.network || 'N/A',
              card_number: `XXXX-XXXX-XXXX-${payment.card?.last4 || 'XXXX'}`,
              card_type: payment_method,
            },
          };
          break;

        case 'netbanking':
          details = {
            netbanking: {
              channel: null,
              netbanking_bank_code: payment.acquirer_data.bank_transaction_id,
              netbanking_bank_name: payment.bank,
            },
          };
          break;

        default:
          platform_type = 'Other';
          payment_method = payment.method || 'N/A';
          details = {};
      }

      const collectRequestStatus =
        new this.databaseService.CollectRequestStatusModel({
          order_amount: payment.amount / 100,
          transaction_amount: payment.amount / 100,
          payment_method : payment_method,
          status:
            payment.status === 'captured'
              ? PaymentStatus.SUCCESS
              : PaymentStatus.FAIL,
          collect_id: collectRequest._id,
          payment_message: payment.error_description || 'Payment Successful',
          payment_time: new Date(payment.created_at * 1000),
          bank_reference: payment.acquirer_data?.rrn || '',
          details: JSON.stringify(details),
        });

        console.log(collectRequest, "collectRequest")
      // await collectRequest.save();
      // await collectRequestStatus.save();
    }

    console.log('[PAYMENTS] Completed fetching payment details');
    return allOrders;
  }

  async retriveRazorpay(authId: string, authSecret: string, order_id: string) {
    const config = {
      method: 'get',
      url: `${process.env.RAZORPAY_URL}/v1/orders/${order_id}/payments`,
      headers: { 'Content-Type': 'application/json' },
      auth: { username: authId, password: authSecret }
    };

    const response = await axios.request(config);
    return response.data.items[0] || [];
  }

  async fetchOrdersPage(
    authId: string,
    authSecret: string,
    count: number,
    skip: number,
    extraParams: Record<string, any> = {},
  ) {
    try {
      const requestParams: { [key: string]: any } = {
        ...extraParams,
        count,
        skip,
      };

      console.log('[REQUEST] Razorpay API call params:', {
        ...requestParams,
        from: requestParams.from
          ? new Date(requestParams.from * 1000).toISOString()
          : 'N/A',
        to: requestParams.to
          ? new Date(requestParams.to * 1000).toISOString()
          : 'N/A',
      });

      const config = {
        method: 'get',
        url: `${process.env.RAZORPAY_URL}/v1/orders`,
        headers: { 'Content-Type': 'application/json' },
        auth: { username: authId, password: authSecret },
        params: requestParams,
      };

      const response = await axios.request(config);

      console.log(`[RESPONSE] Razorpay API status: ${response.status}`);
      return response.data;
    } catch (err) {
      console.error('[REQUEST ERROR] Razorpay API failure:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      throw new InternalServerErrorException(
        `Page request failed: ${err.message}`,
      );
    }
  }
}
