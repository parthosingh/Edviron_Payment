import { BadRequestException, Body, Controller, ForbiddenException, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { CollectService } from './collect.service';
import * as _jwt from "jsonwebtoken";
import {sign} from "../utils/sign";
@Controller('collect')
export class CollectController {
    constructor(private readonly collectService: CollectService){}
    @Post("/")
    async collect(@Body() body: {amount: Number, callbackUrl: string, jwt: string, clientId: string, clientSecret: string}){
        const {amount, callbackUrl, jwt} = body;
        let {clientId, clientSecret} = body;
        if(!jwt) throw new BadRequestException("JWT not provided");
        if(!amount) throw new BadRequestException("Amount not provided");
        if(!callbackUrl) throw new BadRequestException("Callback url not provided");
        console.log(body);
        try{

            if(!clientId) clientId = "TEST10119699dfc4ac6a77923cff313499691101";
            if(!clientSecret) clientSecret = "cfsk_ma_test_b4a126dc34e6bdbf9a0ba9f0d27215c5_16889ba5";
            const decrypted = _jwt.verify(jwt, process.env.KEY!);
            
            if((JSON.stringify({...JSON.parse(JSON.stringify(decrypted)), iat: undefined, exp: undefined}))!==JSON.stringify({
                amount,
                callbackUrl,
                clientId,
                clientSecret
            })){
                throw new ForbiddenException("Request forged");
            }
        } catch(e){
            if(e.name==="JsonWebTokenError") throw new UnauthorizedException("JWT invalid");
            throw e;
        }
        return sign(await this.collectService.collect(amount, callbackUrl, clientId, clientSecret));

    }    
}
