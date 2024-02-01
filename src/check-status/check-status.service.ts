import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';

@Injectable()
export class CheckStatusService {
    constructor(
        private readonly databaseService: DatabaseService, 
        private readonly hdfcService: HdfcService, 
        private readonly phonePeService: PhonepeService,
        private readonly edvironPgService: EdvironPgService
    ) {}
    async checkStatus(collect_request_id: String){
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        switch(collectRequest?.gateway){
            case Gateway.HDFC:
                return await this.hdfcService.checkStatus(collect_request_id);
            case Gateway.PHONEPE:
                return await this.phonePeService.checkStatus(collect_request_id);
            case Gateway.EDVIRON_PG:
                return await this.edvironPgService.checkStatus(collect_request_id, collectRequest);
        }
        // return await this.phonePeService.checkStatus(transactionId);
    }
}

