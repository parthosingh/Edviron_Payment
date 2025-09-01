import { BadRequestException, Injectable } from '@nestjs/common';
import { calculateSHA512Hash } from 'src/utils/sign';
import * as qs from 'qs';
import axios from 'axios';
const { unserialize } = require('php-unserialize');
import { DatabaseService } from 'src/database/database.service';
import { Types } from 'mongoose';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';

@Injectable()
export class PayUService {
  constructor(private readonly databaseService: DatabaseService) { }
  async generate512HASH(
    key: string,
    txnid: string,
    amount: number,
    salt: string,
    firstName: string,
  ) {
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    const hashString = `${key}|${txnid}|${amount}|school_fee|${firstName}|noreply@edviron.com|||||||||||${salt}`;
    // console.log(hashString);
    // BuxMPz|67ece371867428170c271728|1|school_fee|edviron|noreply@edviron.com|||||||||||ePBfYcIbiJPsAyduYb3rPre11uRvaI7a

    const hash = await calculateSHA512Hash(hashString);
    return hash;
  }

  async checkStatus(collect_id: string) {
    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new BadRequestException('Order not found');
      }

      const url = 'https://info.payu.in/merchant/postservice.php?form=2';
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Cookie: 'PHPSESSID=gdtsmpkbmilsv9beouqc1t10u4',
      };
      const hashString = `${request.pay_u_key}|verify_payment|${collect_id}|${request.pay_u_salt}`;
      const hash = await calculateSHA512Hash(hashString);
      console.log('debug');

      const data = qs.stringify({
        key: request.pay_u_key,
        command: 'verify_payment',
        var1: collect_id,
        hash,
      });

      const response = await axios.post(url, data, { headers });
      console.log(response.data);

      const jsonData = response.data;
      const { transaction_details } = jsonData;
      const transactionKey = collect_id;
      const transactionData = transaction_details[transactionKey];

      const {
        mode,
        status,
        net_amount_debit,
        transaction_amount,
        bank_ref_num,
        amt,
        addedon,
      } = transactionData;
      let status_code = 400;
      if (status.toUpperCase() === 'SUCCESS') {
        status_code = 200;
      }
      //   return transactionData
      return {
        status: status.toUpperCase(),
        amount: Number(amt),
        transaction_amount: Number(transaction_amount),
        status_code,
        details: {
          payment_mode: mode.toLowerCase(),
          bank_ref: bank_ref_num,
          payment_methods: {},
          transaction_time: addedon,
        },
        mode,
        net_amount_debit,
        bank_ref_num,
      };
    } catch (e) {
      console.log(e);
      throw new BadRequestException(e.message);
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

  async settlementRecon(
    utr_number: string,
    limit: number = 1000,
    page: number = 0,
    school_id: string,
  ) {
    try {
      const transactions = await this.databaseService.CollectRequestStatusModel.aggregate([

        {
          $match: {
            utr_number
          }
        },
        {
          $lookup: {
            from: 'collectrequests',
            localField: 'collect_id',
            foreignField: '_id',
            as: 'collect_request',
          },
        },
        { $unwind: '$collect_request' },
        {
          $match: {
            'collect_request.school_id': school_id,
          },
        },
        {
          $project: {
            adjustment: null,
            adjustment_remarks: null,
            amount_settled: null,
            cf_payment_id: 'NA',
            cf_settlement_id: 'NA',
            closed_in_favor_of: null,
            customer_email: null,
            customer_name: null,
            customer_phone: '9898989898',
            dispute_category: null,
            dispute_note: null,
            dispute_resolved_on: null,
            entity: 'recon',
            event_amount: '$transaction_amount',
            event_currency: 'INR',
            event_id: '$_id',
            event_settlement_amount: '$transaction_amount',
            event_status: '$status',
            event_time: '$payment_time',
            event_type: 'PAYMENT',
            order_amount: '$order_amount',
            order_id: '$collect_request._id',
            payment_amount: null,
            payment_from: null,
            payment_group: '$payment_method',
            payment_service_charge: `0`,
            payment_service_tax: `0`,
            payment_till: null,
            payment_time: null,
            payment_utr: '$bank_reference',
            reason: null,
            refund_arn: null,
            refund_id: null,
            refund_note: null,
            refund_processed_at: null,
            remarks: null,
            resolved_on: null,
            sale_type: 'CREDIT',
            service_charge: null,
            service_tax: null,
            settlement_charge: null,
            settlement_date: '$settlement_date',
            settlement_initiated_on: null,
            settlement_tax: null,
            settlement_type: null,
            settlement_utr: '$utr_number',
            custom_order_id: '$collect_request.custom_order_id',
            additional_data: '$collect_request.additional_data',
          }
        }
      ])

      console.log(transactions);
      
      
      const enrichedOrders=await Promise.all(transactions.map(async (order) => {
        const studentData=JSON.parse(order.additional_data) || {}
        return {
              ...order,
              school_id: school_id || null,
              student_id: studentData?.student_details?.student_id || null,
              student_name:
                studentData?.student_details?.student_name || null,
              student_email:
                studentData?.student_details?.student_email || null,
              student_phone_no:
                studentData?.student_details?.student_phone_no || null,
            };
      }))

    
      return { transactions: enrichedOrders, count: transactions.length, page, limit };
    } catch (error) {
      throw new Error(`Payment request failed: ${error.message}`);
    }
  }
}


