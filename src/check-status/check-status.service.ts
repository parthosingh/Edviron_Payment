import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import mongoose from 'mongoose';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';

@Injectable()
export class CheckStatusService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly hdfcService: HdfcService,
    private readonly phonePeService: PhonepeService,
    private readonly edvironPgService: EdvironPgService,
    private readonly ccavenueService: CcavenueService,
  ) {}
  async checkStatus(collect_request_id: String) {
    console.log('checking status', collect_request_id);
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      );
    if (!collectRequest) {
      console.log('Collect request not found', collect_request_id);
      throw new NotFoundException('Collect request not found');
    }
    const collect_req_status =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectRequest._id,
      });
    console.log('checking status', collect_request_id, collectRequest);

    switch (collectRequest?.gateway) {
      case Gateway.HDFC:
        return await this.hdfcService.checkStatus(collect_request_id);
      case Gateway.PHONEPE:
        return await this.phonePeService.checkStatus(collect_request_id);
      case Gateway.EDVIRON_PG:
        return await this.edvironPgService.checkStatus(
          collect_request_id,
          collectRequest,
        );

      case Gateway.EDVIRON_EASEBUZZ:
        const easebuzzStatus = await this.edvironPgService.easebuzzCheckStatus(
          collect_request_id.toString(),
          collectRequest,
        );
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          amount: parseInt(easebuzzStatus.msg.amount),
          details: {
            bank_ref: easebuzzStatus.msg.bank_ref_num,
            payment_method: { mode: easebuzzStatus.msg.mode },
            transaction_time: collect_req_status?.updatedAt,
            order_status: easebuzzStatus.msg.status,
          },
        };
        return ezb_status_response;
      case Gateway.EDVIRON_CCAVENUE:
        const res = await this.ccavenueService.checkStatus(
          collectRequest,
          collect_request_id.toString(),
          // collectRequest.ccavenue_access_code,
        );
        const order_info = JSON.parse(res.decrypt_res);
        const status_response = {
          status: res.status,
          amount: res.amount,
          details: {
            transaction_time: res.transaction_time,
            payment_methods: res.paymentInstrument,
            order_status: order_info.Order_Status_Result.order_bank_response,
          },
        };
        return status_response;
        case Gateway.PENDING:
          return {
            status: 'NOT INITIATED',
            amount: collectRequest.amount,
          };
    }
  }

  async checkStatusByOrderId(order_id: String, trusteeId: string) {
    console.log('checking status for custom order id', order_id);
    const collectRequest =
      await this.databaseService.CollectRequestModel.findOne({
        custom_order_id: order_id,
        trustee_id: trusteeId,
      });
    if (!collectRequest) {
      console.log('Collect request not found', order_id);
      throw new NotFoundException('Collect request not found');
    }
    const collect_req_status =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectRequest._id,
      });
    const collectidString = collectRequest._id.toString();
    console.log('checking status', order_id, collectRequest);
    switch (collectRequest?.gateway) {
      case Gateway.HDFC:
        return await this.hdfcService.checkStatus(
          collectRequest._id.toString(),
        );
      case Gateway.PHONEPE:
        return await this.phonePeService.checkStatus(
          collectRequest._id.toString(),
        );
      case Gateway.EDVIRON_PG:
        return await this.edvironPgService.checkStatus(
          collectRequest._id.toString(),
          collectRequest,
        );

      case Gateway.EDVIRON_EASEBUZZ:
        const easebuzzStatus = await this.edvironPgService.easebuzzCheckStatus(
          collectidString,
          collectRequest,
        );
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          amount: parseInt(easebuzzStatus.msg.amount),
          details: {
            bank_ref: easebuzzStatus.msg.bank_ref_num,
            payment_method: { mode: easebuzzStatus.msg.mode },
            transaction_time: collect_req_status?.updatedAt,
            order_status: easebuzzStatus.msg.status,
          },
        };
        return ezb_status_response;
      case Gateway.EDVIRON_CCAVENUE:
        const res = await this.ccavenueService.checkStatus(
          collectRequest,
          collectidString,
          // collectRequest.ccavenue_access_code,
        );
        const order_info = JSON.parse(res.decrypt_res);
        const status_response = {
          status: res.status,
          amount: res.amount,
          details: {
            transaction_time: res.transaction_time,
            payment_methods: res.paymentInstrument,
            order_status: order_info.Order_Status_Result.order_bank_response,
          },
        };
        return status_response;
    }
  }
}
