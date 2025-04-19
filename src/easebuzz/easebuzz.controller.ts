import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
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
} from 'src/utils/sign';
import { encryptCard } from 'src/utils/sign';
import { get } from 'http';
import { EasebuzzService } from './easebuzz.service';
@Controller('easebuzz')
export class EasebuzzController {
  constructor(
    private readonly easebuzzService: EasebuzzService,
    private readonly databaseService: DatabaseService,
  ) {}
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
      const googlePe = 'tez://' + baseUrl;
      const paytm = baseUrl.replace('upi:', 'paytmmp:');
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
    const { card_number, card_holder, card_cvv, card_exp } = req.query;
    console.log('encrypting key and iv');
    const { key, iv } = await merchantKeySHA256();
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
}
