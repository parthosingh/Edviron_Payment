import { BadRequestException, Injectable } from '@nestjs/common';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import axios from 'axios';
import { Parser } from 'json2csv';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; // for unique filename (optional)
import { AwsS3ServiceService } from 'src/aws-s3-service/aws-s3-service.service';
import { stat } from 'fs';

@Injectable()
export class ReportsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cashfreeService: CashfreeService,
    private readonly edvironPgService: EdvironPgService,
    private readonly awsS3Service: AwsS3ServiceService,
  ) {}

  async getTransactionForSettlements(
    utr: string,
    client_id: string,
    limit: number,
    school_name: string,
    cursor: string | null,
    school_id?: string | null,
  ) {
    try {
      const data = {
        pagination: { limit, cursor },
        filters: { settlement_utrs: [utr] },
      };
      console.log(data, 'data for settlements transactions');

      const config = {
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

      const rawOrders = response.data.filter(
        (order: any) => order.order_id && order.event_type !== 'DISPUTE',
      );
      const orderIds = rawOrders.map((order: any) => order.order_id);
      const cfPaymentIds = rawOrders
        .filter(
          (o: any) => o.payment_group === 'VBA_TRANSFER' && o.cf_payment_id,
        )
        .map((o: any) => o.cf_payment_id);

      // Batch DB queries
      const [requests, requestStatuses, customOrders] = await Promise.all([
        this.databaseService.CollectRequestModel.find({
          _id: { $in: orderIds },
        }).lean(),
        this.databaseService.CollectRequestStatusModel.find({
          $or: [
            {
              collect_id: {
                $in: orderIds.map((id: any) => new Types.ObjectId(id)),
              },
            },
            { cf_payment_id: { $in: cfPaymentIds } },
          ],
        }).lean(),
        this.databaseService.CollectRequestModel.find({
          _id: { $in: orderIds },
        }).lean(),
      ]);

      // Maps for quick lookup
      const requestMap = new Map(requests.map((r) => [r._id.toString(), r]));
      const statusByCollectId = new Map(
        requestStatuses
          .filter((s) => s.collect_id)
          .map((s) => [s.collect_id.toString(), s]),
      );
      const statusByCfPaymentId = new Map(
        requestStatuses
          .filter((s) => s.cf_payment_id)
          .map((s) => [s.cf_payment_id, s]),
      );
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

      const enrichedOrders = rawOrders.map((order: any) => {
        const request = requestMap.get(order.order_id);
        if (!request) return null;

        let custom_order_id = null;
        let school_id_resolved = request.school_id || null;
        let payment_id = request.payment_id || null;
        let additionalData: any = {};

        const status =
          statusByCollectId.get(order.order_id) ||
          statusByCfPaymentId.get(order.cf_payment_id);

        // If payment_id is missing, defer resolution (avoid blocking)
        if (!payment_id) {
          // Add to post-processing queue or handle async outside
          console.warn(`Missing payment_id for order: ${order.order_id}`);
        }

        const customData = customOrderMap.get(order.order_id);
        if (customData) {
          custom_order_id = customData.custom_order_id || null;
          school_id_resolved = customData.school_id || school_id_resolved;
          try {
            additionalData = JSON.parse(customData.additional_data || '{}');
          } catch {
            additionalData = {};
          }
        }

        // Handle VBA_TRANSFER override
        if (order.payment_group === 'VBA_TRANSFER' && status?.collect_id) {
          const vbaRequest = requestMap.get(status.collect_id.toString());
          if (vbaRequest) {
            try {
              custom_order_id = vbaRequest.custom_order_id || null;
              school_id_resolved = vbaRequest.school_id || school_id_resolved;
              additionalData = JSON.parse(vbaRequest.additional_data || '{}');
            } catch {
              additionalData = {};
            }
          }
        }

        return {
          school_name: school_name || null,
          school_id: school_id_resolved,
          adjustment: order.adjustment || null,
          transaction_time: status?.payment_time || order.event_time || null,
          custom_order_id: custom_order_id || null,
          order_id: order.order_id,
          payment_id: payment_id,
          order_amount: request.amount || null,
          transaction_amount: status?.transaction_amount || null,
          payment_mode: order.payment_group || status?.payment_method || null,
          status: status?.status || order.event_status || null,
          student_id: additionalData?.student_details?.student_id || null,
          student_name: additionalData?.student_details?.student_name || null,
          student_email: additionalData?.student_details?.student_email || null,
          student_phone_no:
            additionalData?.student_details?.student_phone_no || null,
          settlement_date: order.settlement_date || null,
          settlement_utr: order.settlement_utr || null,
          bank_refrence: status?.bank_reference || null,
        };
      });

      console.timeEnd('enriching orders');

      return {
        cursor: response.cursor,
        limit: response.limit,
        settlements_transactions: enrichedOrders.filter(Boolean),
      };
    } catch (e) {
      console.error(e);
      throw new BadRequestException(
        e.message || 'Something went wrong while processing settlements',
      );
    }
  }

  async getBulkReport(
    utrs: [
      {
        utr: string;
        client_id: string;
        school_name: string;
      },
    ],
    report_id: string,
  ) {
    try {
      console.log(utrs, 'utrs');
      const allTransactions = [];

      for (const utr of utrs) {
        let cursor: string | null = null;
        do {
          const result = await this.getTransactionForSettlements(
            utr.utr,
            utr.client_id,
            1000, //  batch size
            utr.school_name,
            cursor,
          );

          allTransactions.push(...result.settlements_transactions);
          cursor = result.cursor || null;
        } while (cursor);
      }

      if (!allTransactions.length) {
        throw new BadRequestException('No transactions found for given UTRs');
      }

      // Format dates for better CSV readability
      const formatted = allTransactions.map((txn) => ({
        ...txn,
        created_at: txn.created_at
          ? new Date(txn.created_at).toLocaleString('en-IN')
          : '',
        processed_at: txn.processed_at
          ? new Date(txn.processed_at).toLocaleString('en-IN')
          : '',
        settlement_date: txn.settlement_date
          ? new Date(txn.settlement_date).toLocaleString('en-IN')
          : '',
      }));
      // return { len: allTransactions.length, transactions: allTransactions };
      const fields = [
        'school_name',
        'school_id',
        'adjustment',
        'transaction_time',
        'custom_order_id',
        'order_id',
        'payment_id',
        'order_amount',
        'transaction_amount',
        'payment_mode',
        'status',
        'student_id',
        'student_name',
        'student_email',
        'student_phone_no',
        'settlement_date',
        'settlement_utr',
        'bank_refrence',
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(formatted);
      const buffer = Buffer.from(csv, 'utf-8');
      const fileKey = `reports/utr-transactions-${Date.now()}-${uuidv4()}.csv`;

      const s3Url = await this.awsS3Service.uploadToS3(
        buffer,
        fileKey,
        'text/csv',
        process.env.REPORT_BUCKET || 'edviron-reports',
      );
      const config={
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.VANILLA_SERVICE}/main-backend/update-report`,
        headers: {
          accept: 'application/json',
        },
        data:{
          report_id: report_id,
          status: 'COMPLETED',
          url: s3Url,
        }
      }
      await axios.request(config);
      return { report_url: s3Url, total_transactions: allTransactions.length };
    } catch (e) {
      console.log(e);
      throw new BadRequestException(
        e.message || 'Failed to generate bulk report',
      );
    }
  }
}
