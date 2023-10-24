import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';

@Injectable()
export class CheckStatusService {
    constructor(private readonly databaseService: DatabaseService, private readonly hdfcService: HdfcService, private readonly phonePeService: PhonepeService) {}
    async checkStatus(transactionId: String){
        const collectRequest = await this.databaseService.CollectRequestModel.findById(transactionId);
        switch(collectRequest?.gateway){
            case Gateway.HDFC:
                return await this.hdfcService.checkStatus(transactionId);
            case Gateway.PHONEPE:
                return await this.phonePeService.checkStatus(transactionId);
        }
        // return await this.phonePeService.checkStatus(transactionId);
    }
}

