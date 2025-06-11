import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as crypto from 'crypto';
import axios from 'axios';
import { CollectRequest, Gateway } from 'src/database/schemas/collect_request.schema';
import { calculateSHA512Hash, generateSignature } from 'src/utils/sign';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { Types } from 'mongoose';
import e from 'express';

@Injectable()
export class NttdataService {

  private readonly IV = Buffer.from([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  constructor(private readonly databaseService: DatabaseService) { }

  encrypt(text: string, ENC_KEY: any, REQ_SALT: any): string {
    const derivedKey = crypto.pbkdf2Sync(
      Buffer.from(ENC_KEY, 'utf8'),
      Buffer.from(REQ_SALT, 'utf8'),
      65536,
      32,
      'sha512',
    );
    const cipher = crypto.createCipheriv("aes-256-cbc", derivedKey, this.IV);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');
  }

  decrypt(text: string, RES_ENC_KEY: any, RES_SALT: any): string {
    const respassword = Buffer.from(RES_ENC_KEY, 'utf8');
    const ressalt = Buffer.from(RES_SALT, 'utf8');
    const derivedKey = crypto.pbkdf2Sync(
      respassword,
      ressalt,
      65536,
      32,
      'sha512',
    );
    const encryptedText = Buffer.from(text, 'hex');
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      derivedKey,
      this.IV,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  async createOrder(
    request: CollectRequest,
  ): Promise<{ url: string; collect_req: CollectRequest }> {
    const { _id, amount, additional_data, ntt_data } = request;
    const txnDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const formattedAmount =
      Math.round(parseFloat(amount.toString()) * 100) / 100;

    const parsedData = JSON.parse(additional_data);
    const studentEmail =
      parsedData?.student_details?.student_email || 'testemail@email.com';
    const studentPhone =
      parsedData?.student_details?.student_phone_no || '8888888888';

    const payload = {
      payInstrument: {
        headDetails: {
          version: 'OTSv1.1',
          api: 'AUTH',
          platform: 'FLASH',
        },
        merchDetails: {
          merchId: ntt_data.nttdata_id,
          userId: '',
          password: ntt_data.nttdata_secret,
          merchTxnId: _id.toString(),
          merchTxnDate: txnDate,
        },
        payDetails: {
          amount: formattedAmount,
          product: 'SCHOOL',
          txnCurrency: 'INR',
        },
        custDetails: {
          custEmail: studentEmail,
          custMobile: studentPhone,
        },
        extras: {
          udf1: 'udf1',
          udf2: 'udf2',
          udf3: 'udf3',
          udf4: 'udf4',
          udf5: 'udf5',
        },
      },
    };

    try {
      const encData = this.encrypt(
        JSON.stringify(payload), ntt_data.nttdata_req_salt, ntt_data.nttdata_req_salt
      );

      const form = new URLSearchParams({
        encData,
        merchId: ntt_data.nttdata_id,
      });

      const config = {
        method: 'post',
        url: `${process.env.NTT_AUTH_API_URL}/ots/aipay/auth`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: form.toString(),
      };

      const { data } = await axios.request(config);
      console.log(data);

      const encResponse = data?.split('&')?.[1]?.split('=')?.[1];
      if (!encResponse) {
        throw new Error('Encrypted token not found in NTT response');
      }
      const { atomTokenId } = JSON.parse(this.decrypt
        (encResponse, ntt_data.nttdata_res_salt, ntt_data.nttdata_res_salt)
      );

      const updatedRequest =
        await this.databaseService.CollectRequestModel.findOneAndUpdate(
          { _id },
          {
            $set: {
              'ntt_data.ntt_atom_token': atomTokenId,
              'ntt_data.ntt_atom_txn_id': _id.toString(),
              'gateway': Gateway.EDVIRON_NTTDATA,
            }
          },
          { new: true },
        );

      if (!updatedRequest) throw new BadRequestException('Orders not found');

      const url = `${process.env.URL}/nttdata/redirect?collect_id=${_id.toString()}`;
      return { url, collect_req: updatedRequest };
    } catch (error) {
      throw new BadRequestException(error?.message || 'Something went wrong');
    }
  }

  async getTransactionStatus(collect_id: string) {
    try {
      const [coll_req, collec_req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);

      if (!coll_req) throw new BadRequestException('Orders not found');
      if (!collec_req_status) {
        throw new BadRequestException('Error in getting status');
      }
      const ntt_merchant_id = coll_req.ntt_data.nttdata_id;
      const txnId = coll_req._id.toString();
      const formattedAmount =
        Math.round(parseFloat(coll_req.amount.toString()) * 100) / 100;

      const sign = generateSignature(
        coll_req.ntt_data.nttdata_id,
        coll_req.ntt_data.nttdata_secret,
        coll_req._id.toString(),
        formattedAmount.toFixed(2),
        'INR',
        'TXNVERIFICATION',
        coll_req.ntt_data
      );

      const payload = {
        payInstrument: {
          headDetails: {
            api: 'TXNVERIFICATION',
            source: 'OTS',
          },
          merchDetails: {
            merchId: ntt_merchant_id,
            password: coll_req.ntt_data.nttdata_secret,
            merchTxnId: txnId,
            merchTxnDate: coll_req.createdAt?.toISOString().split('T')[0],
          },
          payDetails: {
            atomTxnId: coll_req.ntt_data.ntt_atom_txn_id,
            amount: formattedAmount.toFixed(2),
            txnCurrency: 'INR',
            signature: sign,
          },
        },
      };
      const encData = this.encrypt(
        JSON.stringify(payload), coll_req.ntt_data.nttdata_req_salt, coll_req.ntt_data.nttdata_req_salt
      );
      const form = new URLSearchParams({
        merchId: coll_req.ntt_data.nttdata_id,
        encData,
      });
      const config = {
        method: 'post',
        url: `${process.env.NTT_AUTH_API_URL}/ots/payment/status?${form.toString()}`,
        headers: {
          'cache-control': 'no-cache',
          'Content-Type': 'application/json',
        },
      };
      const { data: paymentStatusRes } = await axios.request(config);
      const encResponse = paymentStatusRes?.split('&')?.[0]?.split('=')?.[1];

      if (!encResponse) {
        throw new Error('Encrypted token not found in NTT response');
      }
      const res = await JSON.parse(this.decrypt(encResponse, coll_req.ntt_data.nttdata_res_salt, coll_req.ntt_data.nttdata_res_salt));
      const { payInstrument } = res;
      const responseData = payInstrument[payInstrument.length - 1];
      const { payDetails, payModeSpecificData, responseDetails } = responseData;
      let status_code = 400;

      if (responseDetails.message == 'SUCCESS') {
        status_code = 200;
      }
      const formattedResponse = {
        status: responseDetails.message,
        amount: coll_req?.amount,
        status_code,
        details: JSON.stringify(payModeSpecificData),
        custom_order_id: coll_req.custom_order_id || null,
      };
      return formattedResponse;
    } catch (error) {
      throw new Error('Failed to fetch transaction status');
    }
  }

  async terminateOrder(collect_id: string) {
    try {
      const [request, req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);
      if (!request || !req_status) {
        throw new BadRequestException('Order not found');
      }
      if (req_status.status === PaymentStatus.PENDING) {
        req_status.status = PaymentStatus.USER_DROPPED;
        req_status.payment_message = 'Session Expired';
        await req_status.save();
        return true;
      }
      return req_status.status !== PaymentStatus.SUCCESS;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to terminate order',
      );
    }
  }


  async generateSignature(signature: any, secretKey: string) {
    const data = signature;
    const hmac = crypto.createHmac('sha512', secretKey);
    hmac.update(data);
    return hmac.digest('hex');
  }

  async initiateRefund(collect_request_id: string, amount: number) {
    try {
      const collect_request =
        await this.databaseService.CollectRequestModel.findById(
          collect_request_id,
        );
      if (!collect_request) {
        throw new BadRequestException('Order not found');
      }
      if (amount > collect_request.amount) {
        throw new BadRequestException(
          "Refund amount can't be greater than order amount",
        );
      }
      const signaturevalue = collect_request.ntt_data.nttdata_id + collect_request.ntt_data.nttdata_secret + collect_request_id + amount + 'INR' + 'REFUNDINIT'

      const signature = await this.generateSignature(signaturevalue, collect_request.ntt_data.nttdata_hash_req_key)

      const payload = {
        payInstrument: {
          headDetails: {
            api: 'REFUNDINIT',
            source: "OTS"
          },
          merchDetails: {
            merchId: collect_request.ntt_data.nttdata_id,
            password: collect_request.ntt_data.nttdata_secret,
            merchTxnId: collect_request_id,
          },
          payDetails: {
            atomTxnId: collect_request.ntt_data.ntt_atom_token,
            signature: signature,
            prodDetails: [
              {
                prodName: "SCHOOL",
                prodRefundId: "refund1",
                prodRefundAmount: amount
              }
            ],
            txnCurrency: "INR",
            totalRefundAmount: amount,
          },
        },
      };

      const encData = this.encrypt(
        JSON.stringify(payload), collect_request.ntt_data.nttdata_req_salt, collect_request.ntt_data.nttdata_req_salt
      );
      const form = new URLSearchParams({
        merchId: collect_request.ntt_data.nttdata_id,
        encData,
      });
      const config = {
        method: 'post',
        url: `https://payment.atomtech.in/ots/payment/refund?${form.toString()}`,
        headers: {
          'cache-control': 'no-cache',
          'Content-Type': 'application/json',
        },
      };
      const { data: paymentStatusRes } = await axios.request(config);
      const encResponse = paymentStatusRes?.split('&')?.[0]?.split('=')?.[1];
      if (!encResponse) {
        throw new Error('Encrypted token not found in NTT response');
      }
      const res = await JSON.parse(this.decrypt
        (encResponse, collect_request.ntt_data.nttdata_res_salt, collect_request.ntt_data.nttdata_res_salt)
      );

      try {
        await this.databaseService.WebhooksModel.create({
          body: JSON.stringify(res),
          gateway: 'ntt_refund'
        });
      } catch (error) {
        throw new BadRequestException(error.message)
      }
      return res;

    } catch (error) {
      throw new BadRequestException(error?.message || 'Something went wrong');
    }
  }

}