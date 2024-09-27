import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  CollectRequest,
  Gateway,
} from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { Transaction } from 'src/types/transaction';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { platformChange } from './collect.controller';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';

@Injectable()
export class CollectService {
  constructor(
    private readonly phonepeService: PhonepeService,
    private readonly hdfcService: HdfcService,
    private readonly edvironPgService: EdvironPgService,
    private readonly databaseService: DatabaseService,
    private readonly ccavenueService: CcavenueService,
  ) {}
  async collect(
    amount: Number,
    callbackUrl: string,
    school_id: string,
    trustee_id: string,
    disabled_modes: string[] = [],
    platform_charges: platformChange[],
    clientId?: string,
    clientSecret?: string,
    webHook?: string,
    additional_data?: {},
    custom_order_id?: string,
    req_webhook_urls?: string[],
    school_name?:string,
    easebuzz_sub_merchant_id?:string,
    ccavenue_merchant_id?: string,
    ccavenue_access_code?: string,
    ccavenue_working_key?: string,
  ): Promise<{ url: string; request: CollectRequest }> {
    console.log(req_webhook_urls,'webhook url');
    console.log(webHook);
    
    console.log(ccavenue_merchant_id,'ccavenue',ccavenue_access_code,ccavenue_working_key);
    
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
    console.log('collect request for amount: ' + amount + ' received.', {
      disabled_modes,
    });

    const gateway = clientId === 'edviron' ? Gateway.HDFC : Gateway.PENDING;

    const request = await new this.databaseService.CollectRequestModel({
      amount,
      callbackUrl,
      gateway: gateway,
      clientId,
      clientSecret,
      webHookUrl: webHook || null,
      disabled_modes,
      school_id,
      trustee_id,
      additional_data: JSON.stringify(additional_data),
      custom_order_id,
      req_webhook_urls,
      easebuzz_sub_merchant_id,
      ccavenue_merchant_id:ccavenue_merchant_id || null,
      ccavenue_access_code:ccavenue_access_code || null,
      ccavenue_working_key:ccavenue_working_key || null,
    }).save();

    await new this.databaseService.CollectRequestStatusModel({
      collect_id: request._id,
      status: PaymentStatus.PENDING,
      order_amount: request.amount,
      transaction_amount: request.amount,
      payment_method: null,
    }).save();

    if (ccavenue_merchant_id) {
      console.log('creating order with CCavenue');
      const transaction = await this.ccavenueService.createOrder(request);
      return { url: transaction.url, request };
    }

    const transaction = (
      gateway === Gateway.PENDING
        ? await this.edvironPgService.collect(request, platform_charges,school_name)
        : await this.hdfcService.collect(request)
    )!;
    await this.databaseService.CollectRequestModel.updateOne(
      {
        _id: request._id,
      },
      {
        payment_data: JSON.stringify(transaction.url),
      },
      { new: true },
    );
    return { url: transaction.url, request };
  }
}
