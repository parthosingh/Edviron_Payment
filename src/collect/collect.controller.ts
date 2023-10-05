import { BadRequestException, Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { CollectService } from './collect.service';
import * as _jwt from "jsonwebtoken";
import {sign} from "../utils/sign";
@Controller('collect')
export class CollectController {
    constructor(private readonly collectService: CollectService){}
    @Post("/")
    async collect(@Body() body: {amount: Number, callbackUrl: String, jwt: string}){
        const {amount, callbackUrl, jwt} = body;
        if(!amount || !callbackUrl || !jwt) throw new BadRequestException("Invalid request");
        // console.log(body);
        try{
            const decrypted = await _jwt.verify(jwt, process.env.KEY!);
            console.log(JSON.stringify(decrypted), JSON.stringify({
                amount,
                callbackUrl
            }));
            if(JSON.stringify(decrypted)!==JSON.stringify({
                amount,
                callbackUrl
            })){
                throw new Error("Request forged");
            } else{
                return sign(await this.collectService.collect(amount, callbackUrl));
            }
        } catch(e){
            console.log(e.message);
            throw new UnauthorizedException();
        }
    }    
}
