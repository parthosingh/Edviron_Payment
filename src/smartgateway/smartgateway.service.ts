import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Types } from 'mongoose';
import { CheckStatusService } from 'src/check-status/check-status.service';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequestDocument } from 'src/database/schemas/collect_request.schema';
import { TransactionStatus } from 'src/types/transactionStatus';

const mapHDFCStatusToTransactionStatus = (
  statusId: number,
): TransactionStatus => {
  switch (statusId) {
    case 10: // NEW
    case 23: // PENDING_VBV
    case 28: // AUTHORIZING
    case 20: // STARTED
      return TransactionStatus.PENDING;

    case 21: // CHARGED
    case 37: // PARTIAL_CHARGED
      return TransactionStatus.SUCCESS;

    case 26: // AUTHENTICATION_FAILED
    case 27: // AUTHORIZATION_FAILED
    case 36: // AUTO_REFUNDED
      return TransactionStatus.FAILURE;

    default:
      return TransactionStatus.USER_DROPPED;
  }
};

@Injectable()
export class SmartgatewayService {
  private readonly API_KEY = process.env.HDFC_SMARTGATEWAY_API_KEY;
  constructor(private readonly databaseService: DatabaseService) {}

  async createBase64(username: string, password: string = ''): Promise<string> {
    const credentials = `${username}:${password}`;
    const base64Encoded = Buffer.from(credentials).toString('base64');
    return `Basic ${base64Encoded}`;
  }

  async createOrder(
    collectRequest: CollectRequestDocument,
    smartgateway_customer_id: string,
    smartgateway_merchant_id: string,
    smart_gateway_api_key: string,
  ): Promise<{ url: string; request: CollectRequestDocument }> {
    try {
      const base64BasicAuthHeader = await this.createBase64(
        smart_gateway_api_key,
      );
      const addiitioal_data = JSON.parse(collectRequest.additional_data);
      const student_name = addiitioal_data?.student_details?.student_name || '';
      const student_email =
        addiitioal_data?.student_details?.student_email || '';
      const student_phone =
        addiitioal_data?.student_details?.student_phone_no || '';
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.HDFC_SMARGATEWAY_URL}/session`,
        headers: {
          Authorization: base64BasicAuthHeader,
          'Content-Type': 'application/json',
          'x-merchantid': smartgateway_merchant_id,
          'x-customerid': smartgateway_customer_id,
        },
        data: {
          order_id: collectRequest._id.toString(),
          amount: collectRequest.amount,
          customer_id: smartgateway_customer_id,
          customer_email: student_email,
          customer_phone: student_phone,
          payment_page_client_id: 'hdfcmaster',
          action: 'paymentPage',
          currency: 'INR',
          return_url: `${process.env.URL}/smartgateway/callback`,
          description: '',
          first_name: student_name?.split(' ')[0] || '',
          last_name: student_name?.split(' ')[1] || '',
        },
      };

      const { data } = await axios.request(config);
      const updatedCollectRequest =
        await this.databaseService.CollectRequestModel.findById(
          collectRequest._id,
        );

      if (!updatedCollectRequest) {
        throw new BadRequestException(
          `CollectRequest with ID ${collectRequest._id} not found.`,
        );
      }

      updatedCollectRequest.payment_data = data?.payment_links?.web ?? null;
      await updatedCollectRequest.save();

      // If status is pending after 15mins, terminate the order
      try {
        setTimeout(
          async () => {
            const collectRequestStatus =
              await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: updatedCollectRequest._id,
              });

            if (
              collectRequestStatus &&
              collectRequestStatus.status === 'PENDING'
            ) {
              this.terminateOrder(
                updatedCollectRequest._id.toString(),
                updatedCollectRequest,
              );
            }
          },
          15 * 60 * 1000,
        );
      } catch (error) {
        console.error('Error in terminateOrder:', error.message);
      }

      return {
        url: updatedCollectRequest.payment_data,
        request: updatedCollectRequest,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new BadRequestException(
          'Invalid client id or client secret: ' +
            JSON.stringify(error.response.data),
        );
      }

      throw new BadRequestException(
        'An unexpected error occurred: ' + error.message,
      );
    }
  }

  async checkStatus(
    collect_id: string,
    collectRequest: CollectRequestDocument,
  ) {
    const base64BasicAuthHeader = await this.createBase64(
      collectRequest?.smart_gateway_api_key,
    );
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.HDFC_SMARGATEWAY_URL}/orders/${collect_id}`,
      headers: {
        Authorization: base64BasicAuthHeader,
        'Content-Type': 'application/json',
        'x-merchantid': collectRequest.smartgateway_merchant_id,
        'x-customerid': collectRequest.smartgateway_customer_id,
      },
    };
    const { data } = await axios.request(config);
    const transaformedResponse = this.transformHdfcTransactionStatus(data);
    return transaformedResponse;
  }

  async terminateOrder(
    order_id: string,
    collectRequest: CollectRequestDocument,
  ) {
    const data = await this.checkStatus(order_id, collectRequest);
    const orderExpiryTime = new Date(data?.order_expiry);
    console.log(orderExpiryTime.toLocaleTimeString());
    const currentTime = new Date();
    if (currentTime > orderExpiryTime) {
      await this.databaseService.CollectRequestStatusModel.findOneAndUpdate(
        {
          collect_id: collectRequest._id,
        },
        {
          $set: {
            status: TransactionStatus.USER_DROPPED,
          },
        },
        { new: true },
      );
    }
    return true;
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
      const status = await this.checkStatus(collect_id, collectRequest);

      if (status.status !== 'CHARGED') {
        throw new BadRequestException('Payment not captured yet.');
      }

      const base64BasicAuthHeader = await this.createBase64(
        collectRequest.smart_gateway_api_key,
      );
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.HDFC_SMARGATEWAY_URL}/${collect_id}/refunds`,
        headers: {
          Authorization: base64BasicAuthHeader,
          'Content-Type': 'application/json',
          'x-merchantid': collectRequest.smartgateway_merchant_id,
          'x-customerid': collectRequest.smartgateway_customer_id,
        },
        data: {
          unique_request_id: refund_id,
          amount: parseFloat(refundAmount.toFixed(2)),
        },
      };
      const data = await axios.request(config);
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new BadGatewayException(error.message);
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async transformHdfcTransactionStatus(data: any) {
    const order_id = data.order_id;
    const request =
      await this.databaseService.CollectRequestModel.findById(order_id);
    if (!request) {
      throw new BadRequestException('Order not found');
    }
    const requestStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: request._id,
      });
    if (!requestStatus) {
      throw new BadRequestException('Order status not found');
    }
    const paymentModeMap: Record<string, string> = {
      CARD: 'card',
      WALLET: 'wallet',
      NB: 'net_banking',
      UPI: 'upi',
    };
    const paymentMode =
      paymentModeMap[String(data.payment_method_type)] ||
      requestStatus.payment_method ||
      'unknown';

    const status = mapHDFCStatusToTransactionStatus(data.status_id);
    const captureStatus = status === 'SUCCESS' ? 'PENDING' : status;
    const statusCode =
      status === TransactionStatus.SUCCESS
        ? 200
        : status === TransactionStatus.FAILURE
        ? 400
        : 202;

    const transformedResponse = {
      status: status,
      status_code: statusCode,
      custom_order_id: request.custom_order_id,
      amount: data.txn_detail?.net_amount || data.amount,
      transaction_amount: data.txn_detail?.txn_amount || data.amount,
      details: {
        payment_mode: paymentMode,
        bank_ref: data.payment_gateway_response?.rrn || null,
        payment_methods: {},
        transaction_time:
          requestStatus.payment_time ||
          new Date(data?.payment_gateway_response?.created) ||
          null,
        formattedTransactionDate:
          data.txn_detail?.created?.split('T')[0] || null,
        order_status: data.status?.toLowerCase() || 'unknown',
        isSettlementComplete: data.refunded || false,
        transfer_utr: data.payment_gateway_response?.epg_txn_id || null,
        service_charge: data.txn_detail?.surcharge_amount || 0,
      },
      capture_status: captureStatus,
    } as any;

    if (paymentMode === 'upi') {
      transformedResponse.details.payment_methods.upi = data.upi;
    }

    if (paymentMode === 'card') {
      transformedResponse.details.payment_mode =
        data.card?.card_type === 'CREDIT' ? 'credit_card' : 'debit_card';
      transformedResponse.details.payment_methods.card = {
        card_bank_name: data.card?.card_issuer || null,
        card_country: 'IN',
        card_network: data.card?.card_brand || null,
        card_number: `XXXXXXXXXXXX${data.card?.last_four_digits}` || null,
        card_sub_type: data.card?.card_type === 'CREDIT' ? 'P' : 'D',
        card_type: paymentMode,
        channel: null,
      };
    }

    if (paymentMode === 'net_banking') {
      transformedResponse.details.payment_methods.net_banking = {
        netbanking_bank_name: data.payment_method || null,
      };
    }

    if (paymentMode === 'wallet') {
      transformedResponse.details.payment_methods.wallet = {
        mode: data.payment_method,
      };
    }

    return transformedResponse;
  }

  async updateTransaction(order_id: string) {
    console.log('chec',order_id);

    const reqStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: new Types.ObjectId(order_id),
      });
    const request =
      await this.databaseService.CollectRequestModel.findById(order_id);
    if (!request) {
      throw new BadRequestException('invalid id');
    }

    if (!reqStatus) {
      throw new BadRequestException('invalid id');
    }
    
    const status = await this.checkStatus(order_id, request);
    
    if (reqStatus.status === 'PENDING') {
      if (
        status &&
        status.status === 'SUCCESS' &&
        status.details.payment_mode === 'upi'
      ) {
        console.log('upi', order_id, status);
        try {
          const { payment_mode, bank_ref, payment_methods, transaction_time } =
            status.details;
          reqStatus.status = 'SUCCESS';
          (reqStatus.payment_method = 'upi'),
            (reqStatus.transaction_amount = status.transaction_amount || 'NA');
          if (status.transaction_time) {
            reqStatus.payment_time = status.transaction_time;
          }
          reqStatus.bank_reference = bank_ref || 'na';
          const info = {
            upi: {
              channel: null,
              upi_id: payment_methods.upi.payer_vpa,
            },
          };
          reqStatus.details = JSON.stringify(info) || 'NA';
          await reqStatus.save();
          return reqStatus;
        } catch (e) {
          console.log(e);
        }
      }
      // else if(status && status.status==='FAILURE' && status.details.payment_mode==='upi'){
      //   console.log('upi',order_id,status);

      //   const {payment_mode,bank_ref,payment_methods,transaction_time}=status.details
      //   reqStatus.status='FAILURE'
      //   reqStatus.payment_method='upi',
      //   reqStatus.transaction_amount=status.transaction_amount || 'NA'
      //   if(status.transaction_time){

      //     reqStatus.payment_time=status.transaction_time
      //   }
      //   reqStatus.bank_reference=bank_ref || 'na'
      //   const info={
      //     upi:{
      //       channel:null,
      //       upi_id:payment_methods.upi.payer_vpa
      //     }
      //   }
      //   reqStatus.details=JSON.stringify(info) || 'NA'
      //   await reqStatus.save()
      //   return reqStatus

      // }
    } else {
      console.log(status.details.payment_mode);
    }
    return;
  }
}
