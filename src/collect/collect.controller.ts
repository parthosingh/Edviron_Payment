import { BadRequestException, Body, Controller, ForbiddenException, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { CollectService } from './collect.service';
import * as _jwt from "jsonwebtoken";
import {sign} from "../utils/sign";
@Controller('collect')
export class CollectController {
    constructor(private readonly collectService: CollectService){}
    @Post("/")
    async collect(@Body() body: {amount: Number, callbackUrl: string, jwt: string, clientId: string, clientSecret: string}){
        const {amount, callbackUrl, jwt, clientId, clientSecret} = body;
        if(!jwt) throw new BadRequestException("JWT not provided");
        if(!amount) throw new BadRequestException("Amount not provided");
        if(!callbackUrl) throw new BadRequestException("Callback url not provided");
        console.log(body);
        try{
            if(!clientId) throw new BadRequestException("Client id not provided");
            if(!clientSecret) throw new BadRequestException("Client secret not provided");
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
