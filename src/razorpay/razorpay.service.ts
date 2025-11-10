import { BadGatewayException, BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { TransactionStatus } from '../types/transactionStatus';
import * as crypto from 'crypto';
import axios from 'axios';
import { CollectRequest, Gateway } from '../database/schemas/collect_request.schema';
import { DatabaseService } from '../database/database.service';
import * as _jwt from 'jsonwebtoken';
import { createCanvas, loadImage } from 'canvas';
import jsQR from "jsqr";
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';

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
export class RazorpayService {
  private readonly CLIENT_ID = process.env.RAZORPAY_PARTNER_KEY_ID;
  private readonly CLIENT_SECRET = process.env.RAZORPAY_PARTNER_KEY_SECRET;
  private readonly API_URL = process.env.RAZORPAY_URL;

  constructor(private readonly databaseService: DatabaseService) { }

  async verifySignature(orderId: string, paymentId: string, signature: string) {
    const body = `${orderId}|${paymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.CLIENT_SECRET ?? '')
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  async createOrder(collectRequest: CollectRequest) {
    try {
      const {
        _id,
        amount: totalRupees,
        razorpay,
        razorpay_vendors_info,
        additional_data,
      } = collectRequest;

      const studentDetail = JSON.parse(additional_data);

      const totalPaise = Math.round(totalRupees * 100);

      const data: any = {
        amount: totalPaise,
        currency: 'INR',
        receipt: _id.toString(),
        notes: {
          student_name: studentDetail?.student_details?.student_name || 'N/A',
          student_email: studentDetail?.student_details?.student_email || 'N/A',
          student_id: studentDetail?.student_details?.student_id || 'N/A',
          student_phone_no:
            studentDetail?.student_details?.student_phone_no || 'N/A',
        },
      };

      if (razorpay_vendors_info?.length) {
        console.log(razorpay_vendors_info, 'razorpay_vendors_info');
        let computed = 0;
        const transfers = razorpay_vendors_info.map((v, idx) => {
          let amtPaise: number;

          if (v.amount !== undefined) {
            amtPaise = Math.round(v.amount * 100);
          } else if (v.percentage !== undefined) {
            amtPaise = Math.round((totalPaise * v.percentage) / 100);
          } else {
            throw new Error(
              `Vendor at index ${idx} must have amount or percentage`,
            );
          }

          computed += amtPaise;
          setTimeout(
            () => {
              this.terminateNotInitiatedOrder(collectRequest._id.toString())
            },
            25 * 60 * 1000,
          )
          
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
        console.log(remainder, 'reminder');
        data.transfers = transfers;
        if (remainder !== 0 && transfers.length > 0) {
          const mainAccount = {
            account: collectRequest.razorpay_seamless.razorpay_account,
            amount: remainder,
            currency: 'INR',
            notes: {},
            linked_account_notes: undefined,
            on_hold: undefined,
            on_hold_until: undefined
          };
          data.transfers.push(mainAccount)
        }

      } else {
        if (collectRequest.razorpay_seamless.razorpay_account) {

          console.log(collectRequest.razorpay_seamless, 'test');

          const nonSplitConfig = {
            account: collectRequest.razorpay_seamless.razorpay_account,
            amount: collectRequest.amount * 100,
            currency: 'INR',
            notes: {},
            linked_account_notes: undefined,
            on_hold: undefined,
            on_hold_until: undefined
          }
          data.transfers = [nonSplitConfig]
        };
      }

      const createOrderConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.RAZORPAY_URL}/v1/orders`,
        auth: {
          username: collectRequest.razorpay_seamless.razorpay_id,
          password: collectRequest.razorpay_seamless.razorpay_secret,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
        },
        data,
      };

      console.log(data, 'create');

      const { data: razorpayRes } = await axios.request(createOrderConfig);
      await (collectRequest as any).constructor.updateOne(
        { _id },
        {
          $set: {
            'razorpay_seamless.order_id': razorpayRes.id,
          },
        },
      );
      return razorpayRes;
    } catch (error) {
      console.log(error.response, 'error in getting razorpay');

      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  async getPaymentStatus(order_id: string, collectRequest: CollectRequest) {
    try {
      console.log('razorpay hit');
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.RAZORPAY_URL}/v1/orders/${order_id}/payments`,
        headers: {
          'content-type': 'application/json',
        },
        auth: {
          username: collectRequest.razorpay_seamless.razorpay_id,
          password: collectRequest.razorpay_seamless.razorpay_secret,
        },
      };
      const { data: orderStatus } = await axios.request(config);
      console.log({ orderStatus });

      const items = orderStatus.items || [];
      const capturedItem = items.find(
        (item: any) => item.status === 'captured',
      );
      if (capturedItem) {
        // console.log('jeerer');
        return await this.formatRazorpayPaymentStatusResponse(
          capturedItem,
          collectRequest,
        );
      }

      // return items[items.length - 1] || [];
      return await this.formatRazorpayPaymentStatusResponse(
        items[items.length - 1] || [],
        collectRequest,
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  async checkOrderStatus(collectId: string, collectRequest: CollectRequest) {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.RAZORPAY_URL}/orders?receipt=${collectId}`,
        auth: {
          username: collectRequest.razorpay_seamless.razorpay_id,
          password: collectRequest.razorpay_seamless.razorpay_secret,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
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

  async checkOrderStatusByRazorpayId(
    razorpayId: string,
    collectRequest: CollectRequest,
  ) {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.RAZORPAY_URL}/orders/${razorpayId}`,
        auth: {
          username: collectRequest.razorpay_seamless.razorpay_id,
          password: collectRequest.razorpay_seamless.razorpay_secret,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
        },
      };
      const { data } = await axios.request(config);
      return await this.formatRazorpayPaymentStatusResponse(
        data,
        collectRequest,
      );
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  async checkPaymentStatus(paymentId: string, collectRequest: CollectRequest) {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.RAZORPAY_URL}/payments/${paymentId}`,
      auth: {
        username: collectRequest.razorpay_seamless.razorpay_id,
        password: collectRequest.razorpay_seamless.razorpay_secret,
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
      },
    };

    try {
      const { data: paymentStatus } = await axios.request(config);
      const formattedStatus = await this.formatRazorpayPaymentStatusResponse(
        paymentStatus,
        collectRequest,
      );
      return formattedStatus;
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
        amount: response?.amount ? response?.amount / 100 : collectRequest.amount,
        transaction_amount: response?.amount ? response?.amount / 100 : collectRequest.amount,
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
        const cardDetails = response.card;
        // await this.fetchCardDetailsOfaPaymentFromRazorpay(
        //   response?.id,
        //   collectRequest,
        // );
        formattedResponse.details.payment_mode = cardDetails?.type;
        formattedResponse.details.payment_methods['card'] = {
          card_bank_name: cardDetails?.issuer || null,
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
          username: collectRequest.razorpay_seamless.razorpay_id,
          password: collectRequest.razorpay_seamless.razorpay_secret,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': collectRequest.razorpay_seamless.razorpay_mid,
        },
      };
      const { data } = await axios.request(config);
      return data;
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  async getDispute(
    dispute_id: string,
    razorpay_mid: string,
    collectRequest: any,
  ) {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.RAZORPAY_URL}/disputes/${dispute_id}`,
        auth: {
          username: collectRequest.razorpay_seamless.razorpay_id,
          password: collectRequest.razorpay_seamless.razorpay_secret,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Account': razorpay_mid,
        },
      };
      const { data } = await axios.request(config);
      return data;
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  async getQr(collectRequest: CollectRequest) {
    try {
      const { order_id } = collectRequest.razorpay_seamless
      const collect_id = collectRequest._id.toString()
      const createQrConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://api.razorpay.com/v1/payments/qr_codes`,
        auth: {
          username: collectRequest.razorpay_seamless.razorpay_id,
          password: collectRequest.razorpay_seamless.razorpay_secret,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          type: 'upi_qr',
          name: 'qr_code',
          usage: 'single_use',
          fixed_amount: true,
          payment_amount: collectRequest.amount * 100,
          order_id: order_id,
          // callback_url: `https://payments.edviron.com/razorpay/callback?collect_id=${collect_id}`,
        },
      };

      console.log(createQrConfig, "createQrConfig");

      const { data: razorpayRes } = await axios.request(createQrConfig);
      console.log(razorpayRes, "");
      console.log(razorpayRes, "response");

      return await this.getbase64(razorpayRes.image_url)

    } catch (error) {
      console.log(error.response?.data || error.message, 'error');
      throw new BadRequestException(error.response?.data || error.message.description);
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
        collectRequest.razorpay_seamless.order_id,
        collectRequest,
      );
      if (status.status !== 'SUCCESS') {
        throw new BadRequestException('Payment not captured yet.');
      }
      const payload = {
        refund_id
      }
      const token = _jwt.sign(payload, process.env.JWT_SECRET_FOR_INTRANET!)
      const refundConfig = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.VANILLA_SERVICE_ENDPOINT
          }/main-backend/get-single-refund?refund_id=${refund_id}&token=${token}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
      }
      const { data: refundInfo } = await axios.request(refundConfig)
      let isSplit = false
      if (refundInfo.isSplitRedund) {
        isSplit = true
      }
      const totalPaise = Math.round(refundAmount * 100);
      const config = {
        method: 'post',
        url: `${process.env.RAZORPAY_URL}/v1/payments/${collectRequest.razorpay_seamless.payment_id}/refund`,
        headers: {
          'Content-Type': 'application/json',
        },
        auth: {
          username: collectRequest.razorpay_seamless.razorpay_id,
          password: collectRequest.razorpay_seamless.razorpay_secret,
        },
        data: {
          amount: totalPaise,
          reverse_all: isSplit || false
        },
      };

      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.log(error, "error")
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

  async getbase64(
    url: string
  ) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const img = await loadImage(Buffer.from(response.data));

      // 2. draw on canvas
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // 3. get image data
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // 4. detect QR
      const qrCode: any = jsQR(imageData.data, imageData.width, imageData.height);
      const qrData = qrCode.data || 'p'

      var QRCode = require('qrcode');
      const base64Image = await QRCode.toDataURL(qrData, { type: "image/png" });

      const phonePe = qrCode.data.replace('upi:', 'phonepe:');
      const paytm = qrCode.data.replace('upi:', 'paytmmp:');
      const gpay = qrCode.data.replace('upi://', 'upi:/');
      const googlePe = 'tez://' + gpay;
      const qrBase64 = base64Image.split(',')[1];

      return {
        base64Image: qrBase64,
        intent: qrCode.data,
        phonePe,
        paytm,
        googlePe
      };
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async saveRazorpayCommission(
    collectReq: CollectRequest,
    platform_type: string
  ) {
    try {
      const collecRequestStatus = await this.databaseService.CollectRequestStatusModel.findOne({ collect_id: collectReq._id })
      if (!collecRequestStatus) {
        throw new BadRequestException('Invalid Request')
      }
      const tokenData = {
        school_id: collectReq?.school_id,
        trustee_id: collectReq?.trustee_id,
        order_amount: collectReq?.amount,
        transaction_amount: collecRequestStatus.transaction_amount,
        platform_type: platform_type,
        payment_mode: collecRequestStatus.payment_method,
        collect_id: collectReq._id,
      };

      const sign = _jwt.sign(tokenData, process.env.KEY!, {
        noTimestamp: true,
      });

      let data = JSON.stringify({
        token: sign,
        school_id: collectReq?.school_id,
        trustee_id: collectReq?.trustee_id,
        order_amount: collectReq?.amount,
        transaction_amount: collecRequestStatus.transaction_amount,
        platform_type: "mappedPaymentMethod",
        payment_mode: collecRequestStatus.payment_method,
        collect_id: collectReq._id,
      });

      // save commission data on trustee service

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/add-commission`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
        },
        data: data,
      };

      try {
        const { data: commissionRes } = await axios.request(config);
        console.log('Commission calculation response:', commissionRes);
      } catch (error) {
        console.error('Error calculating commission:', error.message);
      }
    } catch (e) {

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

}
