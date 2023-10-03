import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';

@Injectable()
export class CheckStatusService {
    constructor(private readonly databaseService: DatabaseService, private readonly phonePeService: PhonepeService) {}
    async checkStatus(transactionId: String){
        return await this.phonePeService.checkStatus(transactionId);
    }
}
