import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest, Gateway } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { Transaction } from 'src/types/transaction';

@Injectable()
export class CollectService {
    constructor(private readonly phonepeService: PhonepeService, private readonly hdfcService: HdfcService, private readonly databaseService: DatabaseService) {}
    async collect(amount: Number, callbackUrl: String): Promise<{url: string, request: CollectRequest}>{
        console.log("collect request for amount: "+ amount+" received.");
        const request = await new this.databaseService.CollectRequestModel({
            amount,
            callbackUrl,
            gateway: Gateway.PHONEPE
        }).save();
        const transaction:Transaction = await this.phonepeService.collect(request);
        return {url: transaction.url, request}
    }
}
