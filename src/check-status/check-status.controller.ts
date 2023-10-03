import { Controller, Get, Param, Query } from '@nestjs/common';
import { CheckStatusService } from './check-status.service';

@Controller('check-status')
export class CheckStatusController {
    constructor(private readonly checkStatusService: CheckStatusService) {}
    @Get("/")
    async checkStatus(@Query("transactionId") id: String){
        return await this.checkStatusService.checkStatus(id);
    }
}
