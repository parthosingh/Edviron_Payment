import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionStatus } from '../types/transactionStatus';
import * as crypto from 'crypto';
import axios from 'axios';
import { CollectRequest } from '../database/schemas/collect_request.schema';
import { DatabaseService } from '../database/database.service';
import { createCanvas, loadImage } from 'canvas';
import jsQR from "jsqr";

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

  constructor(private readonly databaseService: DatabaseService) {}

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
        data: {
          amount: collectRequest.amount * 100,
          currency: 'INR',
          receipt: collectRequest._id.toString(),
        },
      };
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
      const {order_id} = collectRequest.razorpay_seamless
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
          // redirect_url: `https://payments.edviron.com/razorpay/callback?collect_id=${collect_id}`,
        },
      };

      const { data: razorpayRes } = await axios.request(createQrConfig);
      console.log(razorpayRes, 'razorpayRes');

      // return {
      //   qr_id: razorpayRes.id,
      //   status: razorpayRes.status,
      //   image_url: razorpayRes.image_url,
      // };

      return await this.getbase64(razorpayRes.image_url)
    } catch (error) {
      console.log(error.response?.data || error.message, 'error');
      throw new BadRequestException(error.response?.data || error.message);
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

      console.log(base64Image); // "data:image/png;base64,...."
      return {
        base64Image,
        intent:qrCode.data
      };
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

}
