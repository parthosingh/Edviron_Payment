import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { TransactionStatus } from 'src/types/transactionStatus';
import { calculateSHA512Hash } from 'src/utils/sign';
const crypto = require('crypto');

@Injectable()
export class WorldlineService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createOrder(
    request: CollectRequest,
  ): Promise<{ url: string; collect_req: CollectRequest }> {
    const { _id, amount, additional_data, worldline } = request;
    const { worldline_merchant_id } = worldline || {};
    const txnDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const formattedAmount =
      Math.round(parseFloat(amount.toString()) * 100) / 100;
    const parsedData = JSON.parse(additional_data);
    const studentEmail =
      parsedData?.student_details?.student_email || 'testemail@email.com';
    const studentPhone =
      parsedData?.student_details?.student_phone_no || '8888888888';
    const tokendata = `${worldline_merchant_id}|${_id.toString()}|${formattedAmount}|${''}|${''}|${''}|${''}|${''}|${''}|${''}|${''}|${''}|${''}|${''}|${''}|${''}|${
      request.worldline.worldline_encryption_key
    }`;
    const token = await calculateSHA512Hash(tokendata);
    const updatedRequest =
      await this.databaseService.CollectRequestModel.findOneAndUpdate(
        { _id },
        { $set: { worldlineToken: token } },
        { new: true },
      );
    if (!updatedRequest) throw new BadRequestException('Orders not found');
    const url = `${
      process.env.URL
    }/worldline/redirect?collect_id=${_id.toString()}`;
    return { url: url, collect_req: request };
  }

  async SingleUrlIntegeration(
    request: CollectRequest,
  ): Promise<{ url: string; collect_req: CollectRequest }> {
    const { _id, amount, additional_data, worldline } = request;
    const {
      worldline_merchant_id,
      worldline_encryption_key,
      worldline_encryption_iV,
    } = worldline || {};

    const studentDetail = JSON.parse(additional_data);
    const txnDate = new Date();
    const formattedAmount =
      Math.round(parseFloat(amount.toString()) * 100) / 100;
    const clnt_txn_ref = _id.toString();
    const formattedDate =
      txnDate.getDate().toString().padStart(2, '0') +
      '-' +
      (txnDate.getMonth() + 1).toString().padStart(2, '0') +
      '-' +
      txnDate.getFullYear();

    const totalAmountPaisa = formattedAmount * 100;

    const vendorDetails: any = request.worldline_vendors_info || [
      {
        itemId: 'FIRST',
        amount: `${amount}`,
        comAmt: '0',
        identifier: 'FIRST',
      },
    ];

    // if (!vendorDetails) {
    //     throw new BadRequestException('schemacode not found')
    // }
    const totalSchemes = vendorDetails.length;
    const baseAmount = Math.floor(totalAmountPaisa / totalSchemes);
    const extraPaisa = totalAmountPaisa % totalSchemes;
    let items;
    if (!vendorDetails.length) {
      items = [
        {
          itemId: 'FIRST',
          amount: `${amount}`,
          comAmt: '0',
          identifier: 'FIRST',
        },
      ];
    } else {
      items = vendorDetails.map(
        (
          vendor: {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
            scheme_code?: string;
          },
          idx: number,
        ) => {
          let amountInPaise: number;
          if (vendor.amount !== undefined) {
            amountInPaise = Math.round(vendor.amount * 100);
          } else {
            amountInPaise = idx < extraPaisa ? baseAmount + 1 : baseAmount;
          }
          const amount = (amountInPaise / 100).toFixed(2);
          return {
            itemId: vendor.scheme_code,
            amount: `${amount}`,
            comAmt: '0',
            identifier: vendor.scheme_code,
          };
        },
      );
    }

    const totalMappedAmount = items.reduce(
      (sum: any, item: any) => sum + parseFloat(item.amount),
      0,
    );
    const remainingAmount = (request.amount - totalMappedAmount).toFixed(2);
    if (parseFloat(remainingAmount) > 0) {
      items.push({
        itemId: 'FIRST',
        amount: `${remainingAmount}`,
        comAmt: '0',
        identifier: 'FIRST',
      });
    }
    const plainJson = {
      merchant: {
        webhookEndpointURL: `${process.env.URL}/worldline/webhook`,
        responseType: '',
        responseEndpointURL: `${process.env.URL}/worldline/rest/callback/?collect_id=${clnt_txn_ref}`,
        description: '',
        identifier: `${worldline_merchant_id}`,
        webhookType: 'payment.captured',
      },
      cart: {
        // item: [{ "itemId": "SDGI01", "amount": "5", "comAmt": "5"},{ "itemId": "SDGI02", "amount": "5", "comAmt": "5"}],
        // item: [
        //     {
        //         itemId: "FIRST", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "FIRST"
        //     },
        //     {
        //         itemId: "SDGI01", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI01"
        //     },
        //     {
        //         itemId: "SDGI02", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI02"
        //     },
        //     {
        //         itemId: "SDGI03", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI03"
        //     },
        //     {
        //         itemId: "SDGI04", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI04"
        //     },
        //     {
        //         itemId: "SDGI05", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI05"
        //     },
        //     {
        //         itemId: "SDGI06", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI06"
        //     },
        //     {
        //         itemId: "SDGI07", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI07"
        //     },
        //     {
        //         itemId: "SDGI08", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI08"
        //     },
        //     {
        //         itemId: "SDGI09", // ✅ known working value
        //         amount: "1.00",
        //         comAmt: "0",
        //         reference: "test",
        //         identifier: "SDGI09"
        //     },
        //     // {
        //     //     itemId: "SDGI010", // ✅ known working value
        //     //     amount: "1.00",
        //     //     comAmt: "0",
        //     //     reference: "test",
        //     //     identifier: "SDGI010"
        //     // },
        //     // {
        //     //     itemId: "SDGI011", // ✅ known working value
        //     //     amount: "1.00",
        //     //     comAmt: "0",
        //     //     reference: "test",
        //     //     identifier: "SDGI011"
        //     // },
        //     // {
        //     //     itemId: "SDGI012", // ✅ known working value
        //     //     amount: "1.00",
        //     //     comAmt: "0",
        //     //     reference: "test",
        //     //     identifier: "SDGI012"
        //     // },
        //     // {
        //     //     itemId: "SDGI013", // ✅ known working value
        //     //     amount: "1.00",
        //     //     comAmt: "0",
        //     //     reference: "test",
        //     //     identifier: "SDGI013"
        //     // },
        // ],
        item: items,
        reference: '',
        identifier: '',
        description: '',
      },
      payment: {
        method: {
          token: '',
          type: '',
        },
        instrument: {
          expiry: { year: '', month: '', dateTime: '' },
          provider: '',
          iFSC: '',
          holder: {
            name: '',
            address: {
              country: '',
              street: '',
              state: '',
              city: '',
              zipCode: '',
              county: '',
            },
          },
          bIC: '',
          type: '',
          action: '',
          mICR: '',
          verificationCode: '',
          iBAN: '',
          processor: '',
          issuance: { year: '', month: '', dateTime: '' },
          alias: '',
          identifier: '',
          token: '',
          authentication: { token: '', type: '', subType: '' },
          subType: '',
          issuer: '',
          acquirer: '',
        },
        instruction: {
          occurrence: '',
          amount: '',
          frequency: '',
          type: '',
          description: '',
          action: 'N',
          limit: '',
          endDateTime: '',
          debitDay: '',
          debitFlag: 'N',
          identifier: '',
          reference: '',
          startDateTime: '',
          validity: '',
        },
      },
      transaction: {
        deviceIdentifier: 'web',
        smsSending: 'N',
        amount: `${formattedAmount}`,
        forced3DSCall: 'Y',
        type: 'SALE',
        description: '',
        currency: 'INR',
        isRegistration: 'Y',
        identifier: `${clnt_txn_ref}`,
        dateTime: `${formattedDate}`,
        token: '',
        securityToken: '',
        subType: 'DEBIT',
        requestType: 'T',
        reference: '',
        merchantInitiated: 'N',
        tenureId: '',
      },
      consumer: {
        mobileNumber: '9876543210',
        emailID: 'test@test.com',
        identifier: 'c9',
        accountNo: '',
        accountType: '',
        accountHolderName: '',
        aadharNo: '',
      },
    };
    const encryptedData = await this.encryptTxthdnMsg(
      JSON.stringify(plainJson),
      worldline_encryption_key,
      worldline_encryption_iV,
    );

    try {
      const config = {
        method: 'post',
        url: `${process.env.WORLDLINE_URL}/PaymentGateway/merchant2.pg/${worldline_merchant_id}`,
        headers: {
          'Content-Type': 'text/plain',
        },
        data: encryptedData,
      };
      const response = await axios.request(config);

      if (response.status !== 200) {
        throw new Error('Failed to initiate payment with Worldline');
      }
      let recieveHexData = response.data;
      const decryptedData = await this.decryptAES256Hex(
        recieveHexData,
        worldline_encryption_key,
        worldline_encryption_iV,
      );
      const parsedData = JSON.parse(decryptedData);
      const redirectUrl = parsedData?.paymentMethod?.aCS?.bankAcsUrl;
      return { url: redirectUrl, collect_req: request };
    } catch (error) {
      console.error('Worldline Error:', error.message);
      throw error;
    }
  }

  async encryptTxthdnMsg(
    plainText: string,
    encryptionKey: string,
    iv: string,
  ): Promise<string> {
    const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  async decryptAES256Hex(
    hexData: string,
    encryptionKey: string,
    iv: string,
  ): Promise<string> {
    const encryptedData = Buffer.from(hexData, 'hex');
    const decipher = crypto.createDecipheriv('aes-128-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8').trim();
  }

  async getStatus(collect_id: string): Promise<any> {
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectRequest) throw new BadRequestException('Orders not found');
    const { worldline, createdAt, amount } = collectRequest;
    const {
      worldline_merchant_id,
      worldline_encryption_key,
      worldline_encryption_iV,
    } = worldline || {};

    const safeCreatedAt = createdAt ?? new Date();
    const formattedDate =
      safeCreatedAt.getDate().toString().padStart(2, '0') +
      '-' +
      (safeCreatedAt.getMonth() + 1).toString().padStart(2, '0') +
      '-' +
      safeCreatedAt.getFullYear();
    const plainJson = {
      merchant: {
        identifier: `${worldline_merchant_id}`,
      },
      transaction: {
        identifier: `${collect_id}`,
        dateTime: `${formattedDate}`,
        requestType: 'O',
        token: '',
        reference: '',
      },
    };
    const encryptedData = await this.encryptTxthdnMsg(
      JSON.stringify(plainJson),
      worldline_encryption_key,
      worldline_encryption_iV,
    );

    try {
      const config = {
        method: 'post',
        url: `${process.env.WORLDLINE_URL}/PaymentGateway/merchant2.pg/${worldline_merchant_id}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: encryptedData,
      };
      const response = await axios.request(config);
      if (response.status !== 200) {
        throw new Error('Failed to check payment status with Worldline');
      }
      let recieveHexData = response.data;
      const decryptedData = await this.decryptAES256Hex(
        recieveHexData,
        worldline_encryption_key,
        worldline_encryption_iV,
      );
      const parsedData = JSON.parse(decryptedData);
      // return parsedData;
      return await this.formatWorldlinePaymentStatusResponse(
        parsedData,
        collectRequest,
      );
    } catch (error) {
      console.error('Worldline Error:', error.message);
      throw error;
    }
  }

  async formatWorldlinePaymentStatusResponse(
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

      const status =
        response?.paymentMethod?.paymentTransaction?.statusMessage.toUpperCase() ||
        'PENDING';
      const statusCode =
        status === TransactionStatus.SUCCESS
          ? 200
          : status === TransactionStatus.FAILURE
          ? 400
          : 202;

      const formattedResponse: any = {
        status: status,
        amount: response?.paymentMethod?.paymentTransaction?.amount || null,
        transaction_amount: collectRequestStatus?.transaction_amount,
        status_code: statusCode,
        custom_order_id: collectRequest?.custom_order_id,
        details: {
          payment_mode:
            response?.paymentMethod?.paymentTransaction?.errorMessage || null,
          payment_methods: {},
          transaction_time:
            response?.paymentMethod?.paymentTransaction?.dateTime || null,
          formattedTransactionDate: response?.paymentMethod?.paymentTransaction
            ?.dateTime
            ? new Date(
                response?.paymentMethod?.paymentTransaction?.dateTime
                  .split(' ')[0]
                  .split('-')
                  .reverse()
                  .join('-'),
              )
                .toISOString()
                .split('T')[0]
            : null,
          order_status:
            status === TransactionStatus.SUCCESS ? 'PAID' : 'PENDING',
          service_charge: response?.fee ? response?.fee : null,
        },
        capture_status: status || null,
      };

      if (response?.method === 'upi') {
        formattedResponse.details.payment_methods['upi'] = response?.upi;
        formattedResponse.details.bank_ref =
          response?.acquirer_data?.rrn || null;
      }
      if (response?.method === 'card') {
        const cardDetails =
          response?.paymentMethod?.paymentTransaction?.cardDetails || null;
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
      if (response?.paymentMethod?.bankSelectionCode === '470') {
        //netbanking
        formattedResponse.details.payment_mode = 'net_banking';
        formattedResponse.details.payment_methods['net_banking'] = {
          bank: response?.bank || null,
        };
        formattedResponse.details.bank_ref =
          response?.paymentMethod?.paymentTransaction?.reference || null;
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
}
