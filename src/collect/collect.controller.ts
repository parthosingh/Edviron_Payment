import { BadRequestException, Body, Controller, Post, Req, Res } from '@nestjs/common';
import { CollectService } from './collect.service';

@Controller('collect')
export class CollectController {
    constructor(private readonly collectService: CollectService){}
    @Post("/")
    async collect(@Body() body: {amount: Number, callbackUrl: String}){
        if(!body.amount || !body.callbackUrl) throw new BadRequestException("Invalid request");
        return await this.collectService.collect(body.amount, body.callbackUrl);
    }    
}
