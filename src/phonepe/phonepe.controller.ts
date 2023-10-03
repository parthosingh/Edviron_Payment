import { Body, Controller, Post, Res } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';

@Controller('phonepe')
export class PhonepeController {
    constructor(private readonly databaseService: DatabaseService){}
    @Post("/redirect")
    async handleRedirect(@Body() body: any, @Res() res: any){
        res.redirect((await this.databaseService.CollectRequestModel.findById(body.transactionId))?.callbackUrl)
    }
    @Post("/callback")
    async handleCallback(@Body() body: any){
        console.log(body);
        return "OK";
    }
}
