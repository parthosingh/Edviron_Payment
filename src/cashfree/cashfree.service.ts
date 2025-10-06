import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import {
  CollectRequest,
  Gateway,
  PaymentIds,
} from 'src/database/schemas/collect_request.schema';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import * as moment from 'moment-timezone';
import * as jwt from 'jsonwebtoken';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { promises } from 'dns';
import * as https from 'https';
import * as stream from 'stream';
import { promisify } from 'util';
import FormData = require('form-data');
import path from 'path';
import * as mime from 'mime-types';
import { platformChange } from 'src/collect/collect.controller';
@Injectable()
export class CashfreeService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => EdvironPgService))
    private readonly edvironPgService: EdvironPgService,
  ) { }
  async initiateRefund(refund_id: string, amount: number, collect_id: string) {
    const axios = require('axios');
    const refundInfoConfig = {
      method: 'get',
      url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-refund-info?refund_id=${refund_id}`,
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    };

    const res = await axios.request(refundInfoConfig);
    if (res.data.isSplitRedund) {
      try {
        return this.initiateSplitRefund(
          amount,
          refund_id,
          'inititating refund',
          collect_id,
          res.data.split_refund_details,
        );
      } catch (e) {
        console.log(e.message);
      }
    }
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new Error('Collect Request not found');
    }
    console.log('initiating refund with cashfree');

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
      return response.data;
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  async initiateSplitRefund(
    refund_amount: number,
    refund_id: string,
    refund_note: string,
    collect_id: string,
    refund_splits: [
      {
        vendor_id: string;
        amount: number;
        tags: {
          reason: string;
        };
      },
    ],
  ) {
    const data = {
      refund_amount: refund_amount,
      refund_id: refund_id,
      refund_note: refund_note,
      refund_splits,
      refund_speed: 'STANDARD',
    };

    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new BadRequestException('Collect Request not found');
      }
      const config = {
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
      const axios = require('axios');
      const response = await axios.request(config);
      return response.data;
    } catch (e) {
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

      const orderIds = response.data
        .filter((order: any) => order.order_id !== null) // Filter out null order_id
        .map((order: any) => order.order_id);

      // console.log(response, 'response');
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

      let custom_order_id: string | null = null;
      let school_id: string | null = null;
      let payment_id: string | null = null;
      // const enrichedOrders = response.data.map((order: any) => ({
      //   ...order,
      //   custom_order_id: customOrderMap.get(order.order_id) || null,
      //   school_id: customOrderMap.get(order.school_id) || null,
      //   // student_id: customOrderMap.get(JSON.parse(order.additional_data.student_details.student_id)) || null,
      // }));

      const enrichedOrders = await Promise.all(
        response.data
          .filter(
            (order: any) => order.order_id && order.event_type !== 'DISPUTE',
          )
          .map(async (order: any) => {
            let customData: any = {};
            let additionalData: any = {};
            const request =
              await this.databaseService.CollectRequestModel.findById(
                order.order_id,
              );

            if (!request) {
              console.log('order not found');
              throw new BadRequestException('order not found');
            }
            const requestStatus =
              await this.databaseService.CollectRequestStatusModel.findOne(
                { collect_id: request._id }
              );
              if (!requestStatus) {
                console.log('order not found');
                throw new BadRequestException('order not found');
              }
              const order_time=request.createdAt || null
              const payment_details=requestStatus.details
              const split=request.vendors_info || []

            if (
              request.payment_id === null ||
              request.payment_id === '' ||
              request.payment_id === undefined
            ) {
              const cf_payment_id = await this.edvironPgService.getPaymentId(
                order.order_id,
                request,
              );
              request.payment_id = cf_payment_id;
              payment_id = cf_payment_id;
              await request.save();
            } else {
              console.log(request.payment_id);
              payment_id = request.payment_id;
            }
            if (order.order_id) {
              customData = customOrderMap.get(order.order_id) || {};
              try {
                custom_order_id = customData.custom_order_id || null;
                (school_id = customData.school_id || null),
                  (additionalData = JSON.parse(customData?.additional_data));
              } catch {
                additionalData = null;
                custom_order_id = null;
                school_id = null;
              }
            }

            if (order.payment_group && order.payment_group === 'VBA_TRANSFER') {
              const requestStatus =
                await this.databaseService.CollectRequestStatusModel.findOne({
                  cf_payment_id: order.cf_payment_id,
                });

              if (requestStatus) {
                const req =
                  await this.databaseService.CollectRequestModel.findById(
                    requestStatus.collect_id,
                  );
                if (req) {
                  try {
                    custom_order_id = req.custom_order_id || null;
                    order.order_id = req._id;
                    additionalData = JSON.parse(req?.additional_data);
                    school_id = req.school_id;
                  } catch {
                    additionalData = null;
                    custom_order_id = null;
                    school_id = null;
                  }
                }
              }
            } else {
              if (order.order_id) {
                customData = customOrderMap.get(order.order_id) || {};
                try {
                  additionalData = JSON.parse(customData?.additional_data);
                } catch {
                  additionalData = null;
                }
              }
            }

            return {
              ...order,
              custom_order_id: custom_order_id || null,
              school_id: school_id || null,
              student_id: additionalData?.student_details?.student_id || null,
              student_name:
                additionalData?.student_details?.student_name || null,
              student_email:
                additionalData?.student_details?.student_email || null,
              student_phone_no:
                additionalData?.student_details?.student_phone_no || null,
              additional_data: JSON.stringify(additionalData) || null,
              payment_id: payment_id || null,
              order_time,
              payment_details,
              split
            };
          }),
      );

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
      try {
        const response = await axios(config);
        const settlement_info = response.data;
        if (settlement_info.transfer_utr) {
          return {
            isSettlementComplete: true,
            transfer_utr: settlement_info.transfer_utr,
            service_charge: taxes,
          };
        }
      } catch (e) {
        console.log(e.message);
      }
      return {
        isSettlementComplete: false,
        transfer_utr: null,
        service_charge: taxes,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async initiateCapture(
    client_id: string,
    collect_id: string,
    capture: string,
    amount: number,
  ) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) {
        throw new BadRequestException('Collect Request not found');
      }

      const staus = await this.checkStatus(collect_id, collectRequest);
      // console.log(staus,'statu');

      const requestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id,
        });
      if (!requestStatus) {
        throw new BadRequestException('Request status not found');
      }
      await requestStatus.save();
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}/authorization`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data: {
          action: capture,
          amount: requestStatus.transaction_amount,
        },
      };
      // requestStatus.capture_status = 'PENDING';
      const response = await axios(config);
      console.log(response.data);

      requestStatus.capture_status = response.data.authorization.action;
      if (response.data.payment_status === 'VOID') {
        requestStatus.status = PaymentStatus.FAILURE;
        await requestStatus.save();
      }
      await requestStatus.save();
      return response.data;
    } catch (e) {
      // console.log(e);
      if (e.response?.data.message) {
        // console.log(e.response.data);
        throw new BadRequestException(e.response.data.message);
      }

      throw new BadRequestException(e.message);
    }
  }

  async vendorSettlementRecon(
    client_id: string,
    start_date: string,
    end_date: string,
    utrNumber: string[],
    cursor?: string,
  ) {
    try {
      const data = {
        pagination: {
          limit: 1000,
          cursor: cursor,
        },
        filters: {
          settlement_utrs: utrNumber,
          start_date: new Date(
            new Date(start_date).setHours(0, 0, 0, 0),
          ).toISOString(),
          end_date: new Date(
            new Date(end_date).setHours(23, 59, 59, 999),
          ).toISOString(),
        },
      };
      console.log(data, 'payload');

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.CASHFREE_ENDPOINT}/pg/recon/vendor`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data: data,
      };

      const response = await axios(config);
      console.log(response.data, 'ooooooo', data);

      return response.data;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  async getPaymentStatus(order_id: string, client_id: string) {
    console.log(order_id, client_id);

    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${order_id}/payments`,
      headers: {
        accept: 'application/json',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': client_id,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
    };
    try {
      const { data: response } = await axios(config);

      return response.data;
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  async submitDisputeEvidence(
    dispute_id: string,
    documents: Array<{
      file: string;
      doc_type: string;
      note: string;
    }>,
    client_id: string,
  ) {
    const data = {
      dispute_id,
      documents,
    };

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${process.env.CASHFREE_ENDPOINT}/pg/disputes/${dispute_id}/documents`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'multipart/form-data',
        'x-api-version': '2023-08-01',
        'x-partner-merchantid': client_id,
        'x-partner-apikey': process.env.CASHFREE_API_KEY,
      },
      data: data,
    };
    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Something went wrong',
      );
    }
  }

  async acceptDispute(disputeId: string, client_id: string) {
    try {
      const config = {
        method: 'put',
        maxBodyLength: Infinity,
        url: `${process.env.CASHFREE_ENDPOINT}/pg/disputes/${disputeId}/accept`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': client_id,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
      };

      const response = await axios.request(config);

      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Something went wrong',
      );
    }
  }

  async createMerchant(
    merchant_id: string, //school_id
    merchant_email: string, // kyc email
    merchant_name: string, //school_name
    poc_phone: string, // edviron
    merchant_site_url: string, //edviron
    business_details: {
      business_legal_name: string; //req
      // business_type: string; //req
      business_model: string; //req
      business_category?: string | null;
      business_subcategory?: string | null;
      business_pan?: string | null;
      business_address?: string | null;
      business_city?: string | null;
      business_state?: string | null;
      business_postalcode?: string | null;
      business_country?: string | null;
      business_gstin?: string | null;
      business_cin?: string | null;
    },
    website_details: {
      website_contact_us: string;
      website_privacy_policy: string;
      website_refund_policy: string;
      website_tnc: string; // hard cided same for all
      // website_shop_delivery: string;
      // website_checkout_page: string;
      // website_about_us: string;
      // website_pricing_policy: string;
      // website_product_service: string;
      // website_address: string;
    },
    bank_account_details: {
      bank_account_number?: string | null;
      bank_ifsc?: string | null;
    },
    signatory_details: {
      signatory_name: string;
      signatory_pan?: string;
    },
  ): Promise<string> {
    const url = 'https://api.cashfree.com/partners/merchants';
    const headers = {
      'Content-Type': 'application/json',
      'x-partner-apikey': process.env.CASHFREE_API_KEY,
    };
    const data = {
      merchant_id: `${merchant_id}`,
      merchant_email,
      merchant_name,
      poc_phone,
      merchant_site_url,
      business_details,
      website_details: {
        ...website_details,
      },
      bank_account_details,
      signatory_details,
    };

    console.log({
      merchant_email,
      poc_phone,
    });

    const config = {
      method: 'post',
      url,
      headers,
      data,
    };

    try {


      const response = await axios.request(config);
      await this.uploadKycDocs(merchant_id);
      // return response.data;
      return 'Merchant Request Created Successfully on Cashfree';
    } catch (error) {
      console.log(error.response?.data || error.message);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response?.data?.message);
      }
      throw new BadRequestException('Cashfree API request failed');
    }
  }

  async initiateMerchantOnboarding(school_id: string, kyc_mail: string) {
    const kycInfo = await this.getMerchantInfo(school_id, kyc_mail);
    const {
      merchant_id,
      merchant_email,
      merchant_name,
      poc_phone,
      merchant_site_url,
      business_details,
      website_details,
      bank_account_details,
      signatory_details,
    } = kycInfo;
    console.log(kycInfo, 'kyc info');

    const merchant = await this.createMerchant(
      merchant_id,
      merchant_email,
      merchant_name,
      poc_phone,
      merchant_site_url,
      business_details,
      website_details,
      bank_account_details,
      signatory_details,
    );
    return merchant;
  }

  async uploadKycDocs2(school_id: string) {
    try {
      const token = jwt.sign(
        { school_id },
        process.env.JWT_SECRET_FOR_INTRANET!,
      );
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.MAIN_BACKEND}/api/trustee/get-school-kyc?school_id=${school_id}&token=${token}`,
        headers: {
          accept: 'application/json',
        },
      };
      const { data: kycresponse } = await axios.request(config);
      const businessproof_saecertificate = kycresponse.businessProof; //businessproof_saecertificate
      const pipeline = promisify(stream.pipeline);
      const bankProofUrl = kycresponse.bankProof;
      const Businessproof_regproof = kycresponse.entityPan;
      const Businessproof_saecertificate = kycresponse.businessProof;
      if (kycresponse.businessSubCategory === 'Trust') {
        const entityproof_trustdeed = kycresponse.businessProof;
      }
      if (kycresponse.businessSubCategory === 'Society') {
        const Entityproof_societycertificate = kycresponse.businessProof;
      }
      console.log(kycresponse);

      if (!bankProofUrl) {
        throw new BadRequestException('Bank proof not found');
      }

      const response = await axios.get(bankProofUrl, {
        responseType: 'stream',
        httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Optional, if URL is HTTPS with self-signed cert
      });
      const filename = await this.extractFilenameFromUrl(bankProofUrl);

      const form = new FormData();
      form.append('document_type', 'bank_statement');
      form.append('file', response.data, {
        filename: filename, // or .pdf based on content-type or URL extension
        contentType: response.headers['content-type'],
      });

      const cashfreeResponse = await axios.post(
        `https://api.cashfree.com/partners/merchants/${school_id}/documents`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'x-partner-apikey':
              'hMEYtP5hELxG944df6e6223f41e1fc2100c34cb2fb98321ad408',
          },
          maxBodyLength: Infinity,
        },
      );
      return cashfreeResponse.data;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
    // Needed Docs
    // businessproof_regproof	Other Government-Issued Registration Document
  }

  async uploadKycDocs(school_id: string) {
    try {
      const token = jwt.sign(
        { school_id },
        process.env.JWT_SECRET_FOR_INTRANET!,
      );
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.MAIN_BACKEND}/api/trustee/get-school-kyc?school_id=${school_id}&token=${token}`,
        headers: {
          accept: 'application/json',
        },
      };
      const { data: kycresponse } = await axios.request(config);

      // Extract all document URLs with their document types here
      const documentsToUpload: { url: string; docType: string }[] = [];

      // Add bank proof
      if (kycresponse.bankProof) {
        documentsToUpload.push({
          url: kycresponse.bankProof,
          docType: 'bank_statement',
        });
      } else {
        throw new BadRequestException('Bank proof not found');
      }

      // Add business proof - assuming type 'business_proof' or adjust as needed
      if (kycresponse.businessProof) {
        documentsToUpload.push({
          url: kycresponse.businessProof,
          docType: 'businessproof_saecertificate',
        });
      }

      if (kycresponse.affiliation) {
        documentsToUpload.push({
          url: kycresponse.affiliation,
          docType: 'lobproof_education',
        });
      }

      // Add entity PAN document
      // if (kycresponse.entityPan) {
      //   documentsToUpload.push({
      //     url: kycresponse.entityPan,
      //     docType: 'entity_pan',
      //   });
      // }

      // Add trust deed or society certificate based on businessSubCategory
      if (kycresponse.business_type === 'Trust' && kycresponse.businessProof) {
        documentsToUpload.push({
          url: kycresponse.businessProof,
          docType: 'entityproof_trustdeed',
        });
      }
      if (
        kycresponse.business_type === 'Society' &&
        kycresponse.businessProof
      ) {
        documentsToUpload.push({
          url: kycresponse.businessProof,
          docType: 'entityproof_societycertificate',
        });
      }

      // Function to extract filename from URL
      const extractFilenameFromUrl = (url: string): string => {
        try {
          const pathname = new URL(url).pathname;
          const segments = pathname.split('/');
          return segments.pop() || 'file';
        } catch {
          return 'file';
        }
      };

      // Upload each document sequentially and collect results
      const uploadResults = [];

      for (const doc of documentsToUpload) {
        // Download the file stream
        const response = await axios.get(doc.url, {
          responseType: 'stream',
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });

        const filename = extractFilenameFromUrl(doc.url);

        // Prepare form data
        const form = new FormData();
        form.append('document_type', doc.docType);
        form.append('file', response.data, {
          filename,
          contentType: response.headers['content-type'],
        });

        // Call Cashfree API for this document
        try {
          const cashfreeResponse = await axios.post(
            `https://api.cashfree.com/partners/merchants/${school_id}/documents`,
            form,
            {
              headers: {
                ...form.getHeaders(),
                'x-partner-apikey':
                  'hMEYtP5hELxG944df6e6223f41e1fc2100c34cb2fb98321ad408',
              },
              maxBodyLength: Infinity,
            },
          );
          uploadResults.push({
            document: doc.docType,
            response: cashfreeResponse.data,
          });
        } catch (e) {
          console.log(form);
          console.log(doc);
          throw new BadRequestException(e.message);
        }
      }

      return uploadResults; // returns an array of results for each document uploaded
    } catch (e: any) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  async getMerchantInfo(
    school_id: string,
    kyc_mail: string,
  ): Promise<{
    merchant_id: string; //school_id
    merchant_email: string; // kyc email
    merchant_name: string; //school_name
    poc_phone: string; // edviron
    merchant_site_url: string; //edviron
    business_details: {
      business_legal_name: string; //req
      // business_type: string; //req
      business_model: string; //req
      business_category?: string | null;
      business_subcategory?: string | null;
      business_pan?: string | null;
      business_address?: string | null;
      business_city?: string | null;
      business_state?: string | null;
      business_postalcode?: string | null;
      business_country?: string | null;
      business_gstin?: string | null;
      business_cin?: string | null;
    };
    website_details: {
      website_contact_us: string;
      website_privacy_policy: string;
      website_refund_policy: string;
      website_tnc: string;
    };
    bank_account_details: {
      bank_account_number?: string | null;
      bank_ifsc?: string | null;
    };
    signatory_details: {
      signatory_name: string;
      signatory_pan?: string;
    };
  }> {
    const token = jwt.sign({ school_id }, process.env.JWT_SECRET_FOR_INTRANET!);

    const school = await this.edvironPgService.getAllSchoolInfo(school_id);
    console.log(school);
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.MAIN_BACKEND}/api/trustee/get-school-kyc?school_id=${school_id}&token=${token}`,
      headers: {
        accept: 'application/json',
      },
    };
    const { data: response } = await axios.request(config);
    if (!response.businessProofDetails?.business_name) {
      throw new BadRequestException(
        'businessProofDetails?.business_name required',
      );
    }
    if (!response.businessCategory) {
      response.businessCategory = 'Education';
    }
    if (!response.business_type) {
      throw new BadRequestException('business_type is required');
    }
    if (!response.authSignatory?.auth_sighnatory_name_on_aadhar) {
      throw new BadRequestException(
        'authSignatory?.auth_sighnatory_name_on_aadhar, required',
      );
    }

    const details = {
      merchant_id: response.school,
      merchant_email: kyc_mail,
      merchant_name: school.school_name,
      poc_phone: '7304071330', //hard coded
      merchant_site_url: 'https://www.edviron.com/',
      business_details: {
        business_legal_name: response.businessProofDetails?.business_name,
        // business_type: response.business_type, // trust society
        business_model: 'B2C', //Same for everyone
        business_category: response.businessCategory || null, // Education
        business_subcategory: response.businessSubCategory || null,
        business_pan:
          response.businessProofDetails?.business_pan_number || null,
        business_address: response.businessAddress?.address || null,
        business_city: response.businessAddress?.city || null,
        business_state: response.businessAddress?.state || null,
        business_postalcode: response.businessAddress?.pincode || null,
        business_country: 'INDIA',
        business_gstin: response.gst_no || null,
        business_cin: null,
      },
      website_details: {
        website_contact_us: 'https://www.edviron.com/',
        website_privacy_policy: 'https://www.edviron.com/',
        website_refund_policy: 'https://www.edviron.com/',
        website_tnc: 'https://www.edviron.com/',
      },
      bank_account_details: {
        bank_account_number: response.bankDetails?.account_number || null,
        bank_ifsc: response.bankDetails?.ifsc_code || null,
      },
      signatory_details: {
        signatory_name: response.authSignatory?.auth_sighnatory_name_on_aadhar,
        signatory_pan:
          response.authSignatory?.auth_sighnatory_pan_number || null,
      },
    };
    return details;
  }

  async getFilenameFromUrlOrContentType(
    url: string,
    contentType: string | undefined,
  ): Promise<string> {
    // Try to get filename from URL path
    const urlPath = new URL(url).pathname; // e.g. '/files/bankProof_123.pdf'
    let filename = path.basename(urlPath); // e.g. 'bankProof_123.pdf'

    // If filename has no extension, try to get from content-type
    if (!filename || !filename.includes('.')) {
      const ext = mime.extension(contentType || '') || 'bin'; // fallback extension
      filename = `bankProof.${ext}`;
    }

    return filename;
  }

  async extractFilenameFromUrl(url: string) {
    try {
      const pathname = new URL(url).pathname; // "/6828bf8806b55fe0a96f4d6e/businessProof_6828bf8806b55fe0a96f4d6e.pdf"
      const segments = pathname.split('/');
      return segments.pop() || 'file'; // returns the last part or fallback 'file'
    } catch {
      return 'file';
    }
  } // fallback if invalid URL

  async createVBA(
    cf_x_client_id: string,
    cf_x_clien_secret: string,
    virtual_account_details: {
      virtual_account_id: string;
      virtual_account_name: string;
      virtual_account_email: string;
      virtual_account_phone: string;
    },
    notification_group: string,
  ) {
    const config = {
      method: 'post',
      url: `https://api.cashfree.com/pg/vba`,
      maxBodyLength: Infinity,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': cf_x_client_id,
        'x-client-secret': cf_x_clien_secret,
      },
      data: {
        virtual_account_details,
        amount_lock_details: {
          min_amount: 1,
          max_amount: 99999999,
        },
        bank_codes: ['UTIB'],
        notification_group,
      },
    };

    try {
      const { data: response } = await axios.request(config);
      return response;
    } catch (error) {
      console.log(error);

      console.error('Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createVBAV2(
    cf_x_client_id: string,
    cf_x_clien_secret: string,
    virtual_account_details: {
      virtual_account_id: string;
      virtual_account_name: string;
      virtual_account_email: string;
      virtual_account_phone: string;
    },
    notification_group: string,
    amount: number,
  ) {
    const config = {
      method: 'post',
      url: `https://api.cashfree.com/pg/vba`,
      maxBodyLength: Infinity,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': cf_x_client_id,
        'x-client-secret': cf_x_clien_secret,
      },
      data: {
        virtual_account_details,
        amount_lock_details: {
          min_amount: amount,
          max_amount: amount,
        },
        bank_codes: ['UTIB'],
        notification_group,
      },
    };

    try {
      const { data: response } = await axios.request(config);
      console.log(response);

      return response;
    } catch (error) {
      console.log(error);

      console.error('Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createNonSeamlessOrder(
    request: CollectRequest,
    cashfreeVedors?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
      },
    ],
    isSplitPayments?: boolean,
  ) {
    try {
      const currentTime = new Date();

      // Add 20 minutes to the current time test
      const expiryTime = new Date(currentTime.getTime() + 20 * 60000);

      // Format the expiry time in ISO 8601 format with the timezone offset
      const isoExpiryTime = expiryTime.toISOString();
      let data = JSON.stringify({
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
        order_expiry_time: isoExpiryTime,
      });

      if (isSplitPayments && cashfreeVedors) {
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
        });
      }

      const config = {
        method: 'post',
        url: `${process.env.CASHFREE_ENDPOINT}/pg/orders`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid': process.env.CASHFREE_MERCHANT_ID,
          'x-partner-apikey': process.env.CASHFREE_API_KEY,
        },
        data: data,
      };
      const { data: response } = await axios.request(config);
      return response;
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
    }
  }

  async createOrderV2(
    amount: Number,
    callbackUrl: string,
    school_id: string,
    trustee_id: string,
    disabled_modes: string[] = [],
    platform_charges: platformChange[],
    cashfree_credentials: {
      cf_x_client_id: string;
      cf_x_client_secret: string;
      cf_api_key: string;
    },
    clientId: string,
    clientSecret: string,
    webHook?: string,
    additional_data?: {},
    custom_order_id?: string,
    req_webhook_urls?: string[],
    school_name?: string,
    splitPayments?: boolean,
    vendor?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
        scheme_code?: string;
      },
    ],
    vendorgateway?: {
      easebuzz: boolean;
      cashfree: boolean;
    },
    cashfreeVedors?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
      },
    ],
    isVBAPayment?: boolean,
    vba_account_number?: string,
    isSelectGateway?: boolean
  ) {
    try {
      if (custom_order_id) {
        const count =
          await this.databaseService.CollectRequestModel.countDocuments({
            school_id,
            custom_order_id,
          });

        if (count > 0) {
          throw new ConflictException('OrderId must be unique');
        }
      }

      const request = await new this.databaseService.CollectRequestModel({
        amount,
        callbackUrl,
        gateway: Gateway.PENDING,
        clientId,
        clientSecret,
        webHookUrl: webHook || null,
        disabled_modes,
        school_id,
        trustee_id,
        additional_data: JSON.stringify(additional_data),
        custom_order_id,
        req_webhook_urls,
        cashfreeVedors,
        isVBAPayment: isVBAPayment || false,
        vba_account_number: vba_account_number || 'NA',
        isSplitPayments: splitPayments || false,
        cashfree_credentials: cashfree_credentials,
        cashfree_non_partner: true,
        isMasterGateway: isSelectGateway || false
      }).save();

      await new this.databaseService.CollectRequestStatusModel({
        collect_id: request._id,
        status: PaymentStatus.PENDING,
        order_amount: request.amount,
        transaction_amount: request.amount,
        payment_method: null,
      }).save();

      // Initiateing order creation on Cashfree

      let paymentInfo: PaymentIds = {
        cashfree_id: null,
        easebuzz_id: null,
        easebuzz_cc_id: null,
        easebuzz_dc_id: null,
        ccavenue_id: null,
      };
      let schoolName = '';
      if (school_name) {
        schoolName = school_name.replace(/ /g, '-'); //replace spaces because url dosent support spaces
      }
      const axios = require('axios');
      const currentTime = new Date();
      const expiryTime = new Date(currentTime.getTime() + 20 * 60000);
      const isoExpiryTime = expiryTime.toISOString();

      let data = JSON.stringify({
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
        order_expiry_time: isoExpiryTime,
      });

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
        });
        console.log(data);

        request.isSplitPayments = true;
        request.vendors_info = vendor;
        await request.save();

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
          'x-partner-merchantid': cashfree_credentials.cf_x_client_id || null,
          'x-partner-apikey': cashfree_credentials.cf_api_key,
        },
        data: data,
      };
      // console.log(config, 'data');

      const { data: cashfreeRes } = await axios.request(config);
      const cf_payment_id = cashfreeRes.payment_session_id;
      paymentInfo.cashfree_id = cf_payment_id || null;

      if (!request.isVBAPayment) {
        setTimeout(
          () => {
            this.terminateOrder(request._id.toString());
          },
          25 * 60 * 1000,
        ); // 25 minutes in milliseconds
      }

      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      const encodedPlatformCharges = encodeURIComponent(
        JSON.stringify(platform_charges),
      );
      request.paymentIds = paymentInfo;
      const url = process.env.URL +
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
        schoolName
      request.payment_data = `"${url}"`
      await request.save();

      return {
        _id: request._id,
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
          schoolName,
      };
    } catch (e) {
      // console.error('Error:', e);
      throw new BadRequestException(e.message);
    }
  }

  async checkStatusV2(collect_id: string) {
    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new BadRequestException('Collect Request not found');
      }
      const axios = require('axios');

      let config = {
        method: 'get',
        url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/${collect_id}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-partner-merchantid':
            request.cashfree_credentials.cf_x_client_id || null,
          'x-partner-apikey': request.cashfree_credentials.cf_api_key,
        },
      };

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
          collect_id: request._id,
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
      throw new BadRequestException(e.message);
    }
  }

  async generateMasterGatewaypayment(
    collectRequest: CollectRequest,
    school_name: string,
    platform_charges: platformChange[],
    vendor?: [
      {
        vendor_id: string;
        percentage?: number;
        amount?: number;
        name?: string;
        scheme_code?: string;
      },
    ],
  ) {
    try {
      const request = await this.databaseService.CollectRequestModel.findById(collectRequest._id)
      if (!request) {
        throw new BadRequestException('invalid id')
      }
      let paymentInfo: PaymentIds = {
        cashfree_id: null,
        easebuzz_id: null,
        easebuzz_cc_id: null,
        easebuzz_dc_id: null,
        ccavenue_id: null,
      };
      let schoolName = '';
      if (school_name) {
        schoolName = school_name.replace(/ /g, '-'); //replace spaces because url dosent support spaces
      }
      const axios = require('axios');
      const currentTime = new Date();
      const expiryTime = new Date(currentTime.getTime() + 20 * 60000);
      const isoExpiryTime = expiryTime.toISOString();

      let data = JSON.stringify({
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
        order_expiry_time: isoExpiryTime,
      });

      if (
        request.isSplitPayments &&
        request.cashfreeVedors &&
        request.cashfreeVedors.length > 0
      ) {
        const vendor_data = request.cashfreeVedors
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
        });
        request.isSplitPayments = true;
        request.vendors_info = vendor;
        await request.save();

        request.cashfreeVedors.map(async (info) => {
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
          'x-partner-merchantid': request.cashfree_credentials?.cf_x_client_id || null,
          'x-partner-apikey': request.cashfree_credentials?.cf_api_key,
        },
        data: data,
      };
      // console.log(config, 'data');

      const { data: cashfreeRes } = await axios.request(config);
      const cf_payment_id = cashfreeRes.payment_session_id;
      paymentInfo.cashfree_id = cf_payment_id || null;

      if (!request.isVBAPayment) {
        setTimeout(
          () => {
            this.terminateOrder(request._id.toString());
          },
          25 * 60 * 1000,
        ); // 25 minutes in milliseconds
      }

      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      const encodedPlatformCharges = encodeURIComponent(
        JSON.stringify(platform_charges),
      );
      request.paymentIds = paymentInfo;
      const url = process.env.URL +
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
        schoolName
      request.payment_data = `"${url}"`
      await request.save();

      return {
        _id: request._id,
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
          schoolName,
      };
    } catch (e) {

    }
  }
}
