import { Injectable } from '@nestjs/common';
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

@Injectable()
export class CollectService {
  constructor(
    private readonly phonepeService: PhonepeService,
    private readonly hdfcService: HdfcService,
    private readonly edvironPgService: EdvironPgService,
    private readonly databaseService: DatabaseService,
  ) {}
  async collect(
    amount: Number,
    callbackUrl: string,
    clientId: string,
    clientSecret: string,
    webHook?: string,
    disabled_modes: string[] = [],
  ): Promise<{ url: string; request: CollectRequest }> {
    console.log('collect request for amount: ' + amount + ' received.', {
      disabled_modes,
    });

    const gateway = clientId === 'edviron' ? Gateway.HDFC : Gateway.EDVIRON_PG;

    const request = await new this.databaseService.CollectRequestModel({
      amount,
      callbackUrl,
      gateway: gateway,
      clientId,
      clientSecret,
      webHookUrl: webHook || null,
      disabled_modes,
    }).save();

    await new this.databaseService.CollectRequestStatusModel({
      collect_id: request._id,
      status: PaymentStatus.PENDING,
      order_amount: request.amount,
      transaction_amount: request.amount,
      payment_method: null,
    }).save();
    const transaction =
      (gateway === Gateway.EDVIRON_PG
        ? await this.edvironPgService.collect(request)
        : await this.hdfcService.collect(request))!;
    return { url: transaction.url, request };
  }
}
