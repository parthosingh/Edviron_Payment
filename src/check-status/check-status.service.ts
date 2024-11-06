import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import mongoose from 'mongoose';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { TransactionStatus } from 'src/types/transactionStatus';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';

@Injectable()
export class CheckStatusService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly hdfcService: HdfcService,
    private readonly phonePeService: PhonepeService,
    private readonly edvironPgService: EdvironPgService,
    private readonly ccavenueService: CcavenueService,
    private readonly easebuzzService:EasebuzzService
  ) {}
  async checkStatus(collect_request_id: String) {
    console.log('checking status for', collect_request_id);
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(
        collect_request_id,
      );
    if (!collectRequest) {
      console.log('Collect request not found', collect_request_id);
      throw new NotFoundException('Collect request not found');
    }
    const custom_order_id = collectRequest.custom_order_id || null;
    const collect_req_status =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collectRequest._id,
      });
    if (!collect_req_status) {
      console.log('Collect request status not found', collect_request_id);
      throw new NotFoundException('Collect request status not found');
    }
    
    switch (collectRequest?.gateway) {
      case Gateway.HDFC:
        return await this.hdfcService.checkStatus(collect_request_id);
      case Gateway.PHONEPE:
        return await this.phonePeService.checkStatus(collect_request_id);
      case Gateway.EDVIRON_PG:
        const edvironPgResponse = await this.edvironPgService.checkStatus(
          collect_request_id,
          collectRequest,
        );
        return{
          ...edvironPgResponse,
          custom_order_id,
        }

      case Gateway.EDVIRON_EASEBUZZ:
        const easebuzzStatus = await this.easebuzzService.statusResponse(
          collect_request_id.toString(),
          collectRequest,
        );
        let status_code;
        if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
          status_code = 200;
        } else {
          status_code = 400;
        }
        const date =collect_req_status.updatedAt
        if(!date) {
          throw new Error('No date found in the transaction status');
        }
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          status_code,
          custom_order_id,
          amount: parseInt(easebuzzStatus.msg.amount),
          details: {
            bank_ref: easebuzzStatus.msg.bank_ref_num,
            payment_method: { mode: easebuzzStatus.msg.mode },
            transaction_time: collect_req_status?.updatedAt,
            formattedTransactionDate: `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
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
        let status_codes;
        if (
          res.status.toUpperCase() === TransactionStatus.SUCCESS
        ) {
          status_codes = 200;
        } else {
          status_codes = 400;
        }
        const order_info = JSON.parse(res.decrypt_res);
        const status_response = {
          status: res.status,
          status_code: status_codes,
          custom_order_id,
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
          custom_order_id,
          amount: collectRequest.amount,
          status_code: 202,
        };
      case Gateway.EXPIRED:
        return {
          status: PaymentStatus.EXPIRED,
          custom_order_id,
          amount: collectRequest.amount,
          status_code: 202,
        };
    }
  }

  async checkStatusByOrderId(order_id: String, school_id: string) {
    console.log('checking status for custom order id', order_id);
    const collectRequest =
      await this.databaseService.CollectRequestModel.findOne({
        custom_order_id: order_id,
        school_id,
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
        const edv_response= await this.edvironPgService.checkStatus(
          collectRequest._id.toString(),
          collectRequest,
        );
        return {
          ...edv_response,
          edviron_order_id:collectRequest._id.toString(),
        }

      case Gateway.EDVIRON_EASEBUZZ:
        const easebuzzStatus = await this.easebuzzService.statusResponse(
          collectidString,
          collectRequest,
        );
        let status_code;
        if (easebuzzStatus.msg.status.toUpperCase() === 'SUCCESS') {
          status_code = 200;
        } else {
          status_code = 400;
        }
        const ezb_status_response = {
          status: easebuzzStatus.msg.status.toUpperCase(),
          status_code,
          edviron_order_id:collectRequest._id.toString(),
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
        let status_codes;
        if (
          res.status.toUpperCase() === TransactionStatus.SUCCESS
        ) {
          status_codes = 200;
        } else {
          status_codes = 400;
        }
        const status_response = {
          status: res.status,
          edviron_order_id:collectRequest._id.toString(),
          status_code: status_codes,
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
          edviron_order_id:collectRequest._id.toString(),
          status_code: 202,
        };
      case Gateway.EXPIRED:
          return {
            status: PaymentStatus.EXPIRED,
            edviron_order_id:collectRequest._id.toString(),
            amount: collectRequest.amount,
            status_code: 202,
          };
    }
  }
}
