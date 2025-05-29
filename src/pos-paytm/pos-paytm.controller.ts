import { Controller, Post } from '@nestjs/common';
import { PosPaytmService } from './pos-paytm.service';

@Controller('pos-paytm')
export class PosPaytmController {
    constructor(
        private readonly posPaytmService: PosPaytmService,
    ) { }
    @Post('initiate-payment') 
    async initiatePayment() {
        return await this.posPaytmService.collectPayment();
    }

}
