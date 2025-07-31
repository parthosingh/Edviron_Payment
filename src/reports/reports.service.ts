import { BadRequestException, Injectable } from '@nestjs/common';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import axios from 'axios';
@Injectable()
export class ReportsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cashfreeService: CashfreeService,
    private readonly edvironPgService: EdvironPgService,
  ) {}

  async getTransactionForSettlements(
    utr: string,
    client_id: string,
    limit: number,
    school_name: string,
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
}
