import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest, Gateway } from 'src/database/schemas/collect_request.schema';
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
  ): Promise<{ url: string; request: CollectRequest }> {
    console.log('collect request for amount: ' + amount + ' received.');
    const request = await new this.databaseService.CollectRequestModel({
      amount,
      callbackUrl,
      gateway: Gateway.EDVIRON_PG,
      clientId,
      clientSecret,
      webHookUrl: webHook || null,
    }).save();

    await new this.databaseService.CollectRequestStatusModel({
      collect_id: request._id,
      status: PaymentStatus.PENDING,
    }).save();
    const transaction = (await this.edvironPgService.collect(request))!;
    return { url: transaction.url, request };
  }
}
