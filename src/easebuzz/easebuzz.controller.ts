import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { stringify } from 'querystring';
import {
  calculateSHA512Hash,
  decrypt,
  merchantKeySHA256,
  sign,
} from 'src/utils/sign';
import { encryptCard } from 'src/utils/sign';
import { get } from 'http';
import { EasebuzzService } from './easebuzz.service';
import { platformChange } from 'src/collect/collect.controller';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { Types } from 'mongoose';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
@Controller('easebuzz')
export class EasebuzzController {
  constructor(
    private readonly easebuzzService: EasebuzzService,
    private readonly databaseService: DatabaseService,
    private readonly edvironPgService: EdvironPgService,
  ) {}

  @Get('/redirect')
  async redirect(
    @Query('collect_id') collect_id: string,
    @Query('easebuzzPaymentId') easebuzzPaymentId: string,
    @Res() res: any,
  ) {
    try {
      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectRequest) throw new BadRequestException('Order Id not found');
      if (!easebuzzPaymentId) {
        throw new BadRequestException('payment url not found');
      }
      res.redirect(
        `${process.env.EASEBUZZ_ENDPOINT_PROD}/pay/${easebuzzPaymentId}`,
      );
    } catch (error) {
      throw new BadRequestException(error.response?.data || error.message);
    }
  }
  @Get('/upiqr')
  async getQr(@Res() res: any, @Req() req: any) {
    try {
      const collect_id = req.query.collect_id;
      if (!collect_id) {
        throw new NotFoundException('collect_id not found');
      }

      const collectReq =
        await this.databaseService.CollectRequestModel.findById(
          collect_id,
        ).select('deepLink');

      if (!collectReq) {
        throw new NotFoundException('Collect request not found');
      }
      const baseUrl = collectReq.deepLink;
      const phonePe = baseUrl.replace('upi:', 'phonepe:');
      const paytm = baseUrl.replace('upi:', 'paytmmp:');
      const gpay = baseUrl.replace('upi://', 'upi:/');
      const googlePe = 'tez://' + gpay;
      return res.send({
        qr_code: collectReq.deepLink,
        phonePe,
        googlePe,
        paytm,
      }); 
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  @Get('/encrypted-info')
  async getEncryptedInfo(@Res() res: any, @Req() req: any, @Body() body: any) {
    const { card_number, card_holder, card_cvv, card_exp, collect_id } =
      req.query;
    if (!card_number || !card_holder || !card_cvv || !card_exp) {
      throw new BadRequestException('Card details are required');
    }
    const request =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!request) {
      throw new BadRequestException('Collect Request not found');
    }
    console.log('encrypting key and iv');
    const { key, iv } = await merchantKeySHA256(request);
    console.log('key and iv generated', { key, iv });

    console.log(`encrypting data: ${card_number}`);

    const enc_card_number = await encryptCard(card_number, key, iv);
    const enc_card_holder = await encryptCard(card_holder, key, iv);
    const enc_card_cvv = await encryptCard(card_cvv, key, iv);
    const enc_card_exp = await encryptCard(card_exp, key, iv);

    const decrypt_card_number = await decrypt(enc_card_number, key, iv);
    const decrypt_cvv = await decrypt(enc_card_cvv, key, iv);
    const decrypt_exp = await decrypt(enc_card_exp, key, iv);
    const decrypt_card_holder_name = await decrypt(enc_card_holder, key, iv);

    console.log(
      decrypt_card_holder_name,
      decrypt_cvv,
      decrypt_card_number,
      decrypt_exp,
    );

    return res.send({
      card_number: enc_card_number,
      card_holder: enc_card_holder,
      card_cvv: enc_card_cvv,
      card_exp: enc_card_exp,
    });
  }

  @Get('/refundhash')
  async getRefundhash(@Req() req: any) {
    const { collect_id, refund_amount, refund_id } = req.query;

    // key|merchant_refund_id|easebuzz_id|refund_amount|salt
    const hashStringV2 = `${
      process.env.EASEBUZZ_KEY
    }|${refund_id}|${collect_id}|${parseFloat(refund_amount)
      .toFixed(1)
      .toString()}|${process.env.EASEBUZZ_SALT}`;

    let hash2 = await calculateSHA512Hash(hashStringV2);
    const data2 = {
      key: process.env.EASEBUZZ_KEY,
      merchant_refund_id: refund_id,
      easebuzz_id: collect_id,
      refund_amount: parseFloat(refund_amount).toFixed(1),
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

  @Get('/refund-status')
  async checkRefund(@Req() req: any) {
    return await this.easebuzzService.checkRefundSttaus(req.query.collect_id);
  }

  @Post('/settlement-recon')
  async settlementRecon(
    @Body()
    body: {
      submerchant_id: string;
      start_date: string;
      end_date: string;
      page_size: number;
      token: string;
    },
  ) {
    try {
      const { submerchant_id, start_date, end_date, page_size, token } = body;

      if (!token) throw new BadRequestException('Token is required');
      const data = jwt.verify(token, process.env.PAYMENTS_SERVICE_SECRET!) as {
        submerchant_id: string;
      };

      if (!data) throw new BadRequestException('Request Forged');

      if (data.submerchant_id !== submerchant_id)
        throw new BadRequestException('Request Forged');

      const hashString = `${process.env.EASEBUZZ_KEY}|${start_date}|${end_date}|${process.env.EASEBUZZ_SALT}`;
      const hash = await calculateSHA512Hash(hashString);
      const payload = {
        merchant_key: process.env.EASEBUZZ_KEY,
        //   "merchant_email": "aditya@edviron.com",
        payout_date: {
          start_date,
          end_date,
        },
        page_size,
        hash,
        submerchant_id,
      };

      const config = {
        method: 'post',
        url: `https://dashboard.easebuzz.in/settlements/v1/retrieve`,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: payload,
      };

      const { data: resData } = await axios.request(config);

      const orderIds = resData?.data[0]?.peb_transactions.map(
        (data: any) => data?.txnid,
      );

      const customOrders = await this.databaseService.CollectRequestModel.find({
        _id: { $in: orderIds },
      });

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

      const enrichedOrders = resData?.data[0]?.peb_transactions.map(
        (order: any) => {
          let customData: any = {};
          let additionalData: any = {};
          if (order.txnid) {
            customData = customOrderMap.get(order.txnid) || {};
            additionalData = JSON.parse(customData?.additional_data);
          }
          return {
            ...order,
            custom_order_id: customData.custom_order_id || null,
            school_id: customData.school_id || null,
            student_id: additionalData?.student_details?.student_id || null,
            student_name: additionalData.student_details?.student_name || null,
            student_email:
              additionalData.student_details?.student_email || null,
            student_phone_no:
              additionalData.student_details?.student_phone_no || null,
          };
        },
      );

      return {
        transactions: enrichedOrders,
        split_payouts: resData?.data[0]?.split_payouts,
        peb_refunds: resData?.data[0]?.peb_refunds,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Something Went Wrong');
    }
  }

  @Post('/update-dispute')
  async updateEasebuzzDispute(
    @Body()
    body: {
      case_id: string;
      action: string;
      reason: string;
      documents: Array<{ document_type: any; file_url: string }>;
      sign: string;
    },
  ) {
    try {
      const { case_id, action, reason, documents, sign } = body;
      const decodedToken = jwt.verify(sign, process.env.KEY!) as {
        case_id: string;
        action: string;
      };
      if (!decodedToken) throw new BadRequestException('Request Forged');
      if (decodedToken.action !== action || decodedToken.case_id !== case_id)
        throw new BadRequestException('Request Forged');
      const data = await this.easebuzzService.updateDispute(
        case_id,
        action,
        reason,
        documents,
      );
      return data;
    } catch (error) {
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  @Post('/create-order-v2')
  async createOrderV2(
    @Body()
    body: {
      amount: Number;
      callbackUrl: string;
      jwt: string;
      school_id: string;
      trustee_id: string;
      webHook?: string;
      disabled_modes?: string[];
      platform_charges: platformChange[];
      additional_data?: {};
      custom_order_id?: string;
      req_webhook_urls?: string[];
      school_name?: string;
      easebuzz_sub_merchant_id?: string;
      split_payments?: boolean;
      easebuzz_school_label?: string | null;
      easebuzzVendors?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
        },
      ];
      easebuzz_non_partner_cred: {
        easebuzz_salt: string;
        easebuzz_key: string;
        easebuzz_merchant_email: string;
        easebuzz_submerchant_id: string;
      };
    },
  ) {
    // console.log(body);

    const {
      amount,
      callbackUrl,
      jwt,
      webHook,
      disabled_modes,
      platform_charges,
      additional_data,
      school_id,
      trustee_id,
      custom_order_id,
      req_webhook_urls,
      school_name,
      easebuzz_sub_merchant_id,
      split_payments,
      easebuzzVendors,
      easebuzz_school_label,
      easebuzz_non_partner_cred,
    } = body;
    try {
      // CHECK FOR DUPLICATE CUSTOM ID
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
      console.log(easebuzz_non_partner_cred);

      if (!easebuzz_non_partner_cred) {
        throw new BadRequestException('EASEBUZZ CREDENTIAL IS MISSING');
      }
      if (
        !easebuzz_non_partner_cred.easebuzz_key ||
        !easebuzz_non_partner_cred.easebuzz_merchant_email ||
        !easebuzz_non_partner_cred.easebuzz_salt ||
        !easebuzz_non_partner_cred.easebuzz_submerchant_id
      ) {
        throw new BadRequestException('EASEBUZZ CREDENTIAL IS MISSING');
      }

      const request = await new this.databaseService.CollectRequestModel({
        amount,
        callbackUrl,
        gateway: Gateway.PENDING,
        webHookUrl: webHook || null,
        disabled_modes,
        school_id,
        trustee_id,
        additional_data: JSON.stringify(additional_data),
        custom_order_id,
        req_webhook_urls,
        easebuzz_sub_merchant_id:
          easebuzz_non_partner_cred.easebuzz_submerchant_id,
        easebuzzVendors,
        paymentIds: { easebuzz_id: null },
        easebuzz_non_partner: true,
        easebuzz_non_partner_cred,
        isSplitPayments: split_payments,
        easebuzz_split_label: easebuzz_school_label,
      }).save();

      await new this.databaseService.CollectRequestStatusModel({
        collect_id: request._id,
        status: PaymentStatus.PENDING,
        order_amount: request.amount,
        transaction_amount: request.amount,
        payment_method: null,
      }).save();
      const schoolName = school_name || '';
      if (split_payments) {
        console.log(split_payments);

        return sign(
          await this.easebuzzService.createOrderV2(
            request,
            platform_charges,
            schoolName,
          ),
        );
      }
      console.log('nonsplit');
      return sign(
        await this.easebuzzService.createOrderV2NonSplit(
          request,
          platform_charges,
          schoolName,
          easebuzz_school_label || null,
        ),
      );
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Post('/webhook')
  async easebuzzWebhook(@Body() body: any, @Res() res: any) {
    console.log('easebuzz webhook recived with data', body);

    if (!body) throw new Error('Invalid webhook data');
    let collect_id = body.txnid;
    if (collect_id.startsWith('upi_')) {
      collect_id = collect_id.replace('upi_', '');
    }
    console.log('webhook for ', collect_id);

    if (!Types.ObjectId.isValid(collect_id)) {
      throw new Error('collect_id is not valid');
    }
    const collectIdObject = new Types.ObjectId(collect_id);

    const collectReq =
      await this.databaseService.CollectRequestModel.findById(collectIdObject);
    if (!collectReq) throw new Error('Collect request not found');

    collectReq.gateway = Gateway.EDVIRON_EASEBUZZ;
    await collectReq.save();
    const transaction_amount = body.net_amount_debit || null;
    // const payment_method = body.mode || null;
    let payment_method;
    let details;

    const saveWebhook = await new this.databaseService.WebhooksModel({
      collect_id: collectIdObject,
      body: JSON.stringify(body),
    }).save();

    const pendingCollectReq =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectIdObject,
      });
    if (
      pendingCollectReq &&
      pendingCollectReq.status !== PaymentStatus.PENDING
    ) {
      console.log('No pending request found for', collect_id);
      res.status(200).send('OK');
      return;
    }
    // Auto Refund for Duplicate Payment
    if (collectReq.school_id === '65d443168b8aa46fcb5af3e4') {
      try {
        if (
          pendingCollectReq &&
          pendingCollectReq.status !== PaymentStatus.PENDING &&
          pendingCollectReq.status !== PaymentStatus.SUCCESS
        ) {
          console.log('Auto Refund for Duplicate Payment ', collect_id);
          const tokenData = {
            school_id: collectReq?.school_id,
            trustee_id: collectReq?.trustee_id,
          };
          const token = jwt.sign(tokenData, process.env.KEY!, {
            noTimestamp: true,
          });
          const autoRefundConfig = {
            method: 'POST',
            url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/initiate-auto-refund`,
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: {
              token,
              refund_amount: collectReq.amount,
              collect_id,
              school_id: collectReq.school_id,
              trustee_id: collectReq?.trustee_id,
              custom_id: collectReq.custom_order_id || 'NA',
              gateway: 'EASEBUZZ',
              reason: 'Auto Refund due to dual payment',
            },
          };
          const autoRefundResponse = await axios.request(autoRefundConfig);
          console.log(autoRefundResponse.data, 'refund');
          const refund_id = autoRefundResponse.data._id.toString();
          const refund_amount = autoRefundResponse.data.refund_amount;
          const refund_process = await this.easebuzzService.initiateRefund(
            collect_id,
            refund_amount,
            refund_id,
          );
          console.log('Auto refund Initiated', refund_process);
          pendingCollectReq.isAutoRefund = true;
          pendingCollectReq.status = PaymentStatus.FAILURE;
          await pendingCollectReq.save();
          return res.status(200).send('OK');
        }
      } catch (e) {
        console.log(e);
      }
    }

    const statusResponse =
      await this.easebuzzService.easebuzzWebhookCheckStatusV2(
        body.txnid,
        collectReq,
      );
    const reqToCheck = statusResponse;
    console.log(statusResponse, 'status response check');

    const status = reqToCheck.msg.status;
    let platform_type;
    // let payment_mode
    switch (body.mode) {
      case 'MW':
        payment_method = 'wallet';
        platform_type = 'Wallet';
        details = {
          app: {
            channel: reqToCheck.msg.bank_name,
            provider: reqToCheck.msg.bank_name,
          },
        };
        break;
      case 'OM':
        payment_method = 'wallet';
        platform_type = 'Wallet';
        details = {
          app: {
            channel: reqToCheck.msg.bank_name,
            provider: reqToCheck.msg.bank_name,
          },
        };
        break;
      case 'NB':
        payment_method = 'net_banking';
        platform_type = 'NetBanking';
        details = {
          netbanking: {
            netbanking_bank_code: reqToCheck.msg.bank_code,
            netbanking_bank_name: reqToCheck.msg.bank_name,
          },
        };
        break;
      case 'CC':
        payment_method = 'credit_card';
        platform_type = 'CreditCard';
        details = {
          card: {
            card_bank_name: reqToCheck.msg.bank_name,
            provicard_network: reqToCheck.msg.cardCategory,
            card_number: reqToCheck.msg.cardnum,
            card_type: 'credit_card',
          },
        };
        break;
      case 'DC':
        payment_method = 'debit_card';
        platform_type = 'DebitCard';
        details = {
          card: {
            card_bank_name: reqToCheck.msg.bank_name,
            provicard_network: reqToCheck.msg.cardCategory,
            card_number: reqToCheck.msg.cardnum,
            card_type: 'debit_card',
          },
        };
        break;
      case 'UPI':
        payment_method = 'upi';
        platform_type = 'Others';
        details = {
          upi: {
            upi_id: reqToCheck.msg.upi_va,
          },
        };
        break;
      case 'PL':
        payment_method = 'pay_later';
        platform_type = 'PayLater';
        details = {
          pay_later: {
            channel: reqToCheck.msg.bank_name,
            provider: reqToCheck.msg.bank_name,
          },
        };
        break;
      default:
        payment_method = 'Unknown';
    }
    // Commission adding
    if (statusResponse.msg.status.toUpperCase() === 'SUCCESS') {
      try {
        const schoolInfo = await this.edvironPgService.getSchoolInfo(
          collectReq.school_id,
        );
        const email = schoolInfo.email;
        // await this.edvironPgService.sendTransactionmail(email, collectReq);
      } catch (e) {
        console.log('error in sending transaction mail ');
      }
      const payment_mode = body.bank_name;

      const tokenData = {
        school_id: collectReq?.school_id,
        trustee_id: collectReq?.trustee_id,
        order_amount: pendingCollectReq?.order_amount,
        transaction_amount,
        platform_type,
        payment_mode,
        collect_id: collectReq?._id,
      };
      const _jwt = jwt.sign(tokenData, process.env.KEY!, { noTimestamp: true });

      let data = JSON.stringify({
        token: _jwt,
        school_id: collectReq?.school_id,
        trustee_id: collectReq?.trustee_id,
        order_amount: pendingCollectReq?.order_amount,
        transaction_amount,
        platform_type,
        payment_mode,
        collect_id: collectReq?._id,
      });
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
        console.log(commissionRes, 'Commission saved');
      } catch (e) {
        console.log(`failed to save commision ${e.message}`);
      }
    }
    try {
      if (collectReq.isSplitPayments) {
        try {
          const vendor =
            await this.databaseService.VendorTransactionModel.updateMany(
              {
                collect_id: collectReq._id,
              },
              {
                $set: {
                  payment_time: new Date(body.addedon),
                  status: status,
                  gateway: Gateway.EDVIRON_EASEBUZZ,
                },
              },
            );
        } catch (e) {
          console.log('Error in updating vendor transactions');
        }
      }
    } catch (e) {
      console.log(e);
    }

    const payment_time = new Date(body.addedon);
    const updateReq =
      await this.databaseService.CollectRequestStatusModel.updateOne(
        {
          collect_id: collectIdObject,
        },
        {
          $set: {
            status,
            transaction_amount,
            payment_method,
            details: JSON.stringify(details),
            bank_reference: body.bank_ref_num,
            payment_time,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

    const webHookUrl = collectReq?.req_webhook_urls;
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    const collectRequestStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectIdObject,
      });

    if (!collectRequestStatus) {
      throw new Error('Collect Request Not Found');
    }
    const transactionTime = collectRequestStatus.updatedAt;
    if (!transactionTime) {
      throw new Error('Transaction Time Not Found');
    }

    const amount = reqToCheck?.amount;
    const custom_order_id = collectRequest?.custom_order_id || '';
    const additional_data = collectRequest?.additional_data || '';
    const webHookDataInfo = {
      collect_id,
      amount,
      status,
      trustee_id: collectReq.trustee_id,
      school_id: collectReq.school_id,
      req_webhook_urls: collectReq?.req_webhook_urls,
      custom_order_id,
      createdAt: collectRequestStatus?.createdAt,
      transaction_time: payment_time || collectRequestStatus?.updatedAt,
      additional_data,
      details: collectRequestStatus.details,
      transaction_amount: collectRequestStatus.transaction_amount,
      bank_reference: collectRequestStatus.bank_reference,
      payment_method: collectRequestStatus.payment_method,
      payment_details: collectRequestStatus.details,
      formattedDate: `${transactionTime.getFullYear()}-${String(
        transactionTime.getMonth() + 1,
      ).padStart(2, '0')}-${String(transactionTime.getDate()).padStart(
        2,
        '0',
      )}`,
    };

    if (webHookUrl !== null) {
      console.log('calling webhook');
      if (
        collectRequest?.trustee_id.toString() === '66505181ca3e97e19f142075'
      ) {
        console.log('Webhook called for webschool');
        setTimeout(async () => {
          await this.edvironPgService.sendErpWebhook(
            webHookUrl,
            webHookDataInfo,
          );
        }, 60000);
      } else {
        console.log('Webhook called for other schools');

        await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo);
      }
    }

    try {
      await this.edvironPgService.sendMailAfterTransaction(
        collectIdObject.toString(),
      );
    } catch (e) {
      await this.databaseService.ErrorLogsModel.create({
        type: 'sendMailAfterTransaction',
        des: collectIdObject.toString(),
        identifier: 'EdvironPg webhook',
        body: e.message || e.toString(),
      });
    }
    res.status(200).send('OK');
    return;
  }

  @Get('/easebuzz-callback')
  async handleEasebuzzCallback(@Req() req: any, @Res() res: any) {
    const { collect_request_id } = req.query;
    console.log(req.query.status, 'easebuzz callback status');

    const collectRequest =
      (await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      ))!;

    collectRequest.gateway = Gateway.EDVIRON_EASEBUZZ;
    await collectRequest.save();
    const statusResponse = await this.easebuzzService.statusResponsev2(
      collect_request_id,
      collectRequest,
    );
    const reqToCheck = statusResponse;
    console.log(statusResponse, 'status response check');

    const status = reqToCheck.msg.status;

    if (collectRequest?.sdkPayment) {
      const callbackUrl = new URL(collectRequest?.callbackUrl);
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      if (status === `success`) {
        console.log(`SDK payment success for ${collect_request_id}`);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`,
        );
      }
      console.log(`SDK payment failed for ${collect_request_id}`);
      callbackUrl.searchParams.set('status', 'SUCCESS');

      return res.redirect(
        `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`,
      );
    }

    const callbackUrl = new URL(collectRequest?.callbackUrl);
    if (status.toLocaleLowerCase() !== `success`) {
      console.log('failure');
      let reason = reqToCheck?.msg?.error_Message || 'payment-declined';
      if (reason === 'Collect Expired') {
        reason = 'Order Expired';
      }
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      return res.redirect(
        `${callbackUrl.toString()}&status=cancelled&reason=${reason}`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
    callbackUrl.searchParams.set('status', 'SUCCESS');
    return res.redirect(callbackUrl.toString());
  }

  @Post('/easebuzz-callback')
  async handleEasebuzzCallbackPost(@Req() req: any, @Res() res: any) {
    const { collect_request_id } = req.query;
    console.log(req.query.status, 'easebuzz callback status');

    const collectRequest =
      (await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      ))!;

    collectRequest.gateway = Gateway.EDVIRON_EASEBUZZ;
    await collectRequest.save();
    const statusResponse = await this.easebuzzService.statusResponsev2(
      collect_request_id,
      collectRequest,
    );
    const reqToCheck = statusResponse;
    console.log(statusResponse, 'status response check');

    const status = reqToCheck.msg.status;

    if (collectRequest?.sdkPayment) {
      const callbackUrl = new URL(collectRequest?.callbackUrl);
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      if (status === `success`) {
        console.log(`SDK payment success for ${collect_request_id}`);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`,
        );
      }
      console.log(`SDK payment failed for ${collect_request_id}`);
      callbackUrl.searchParams.set('status', 'SUCCESS');

      return res.redirect(
        `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}&EdvironCollectRequestId=${collect_request_id}`,
      );
    }

    const callbackUrl = new URL(collectRequest?.callbackUrl);
    if (status.toLocaleLowerCase() !== `success`) {
      console.log('failure');
      let reason = reqToCheck?.msg?.error_Message || 'payment-declined';
      if (reason === 'Collect Expired') {
        reason = 'Order Expired';
      }
      callbackUrl.searchParams.set(
        'EdvironCollectRequestId',
        collect_request_id,
      );
      return res.redirect(
        `${callbackUrl.toString()}&status=cancelled&reason=${reason}`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_request_id);
    callbackUrl.searchParams.set('status', 'SUCCESS');
    return res.redirect(callbackUrl.toString());
  }
}
