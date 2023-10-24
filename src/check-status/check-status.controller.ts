import { Controller, Get, Param, Query, UnauthorizedException } from '@nestjs/common';
import { CheckStatusService } from './check-status.service';
import { sign } from 'src/utils/sign';
import * as _jwt from "jsonwebtoken";

@Controller('check-status')
export class CheckStatusController {
    constructor(private readonly checkStatusService: CheckStatusService) {}
    @Get("/")
    async checkStatus(@Query("transactionId") transactionId: String, @Query("jwt") jwt: string){
        try{
            const decrypted = await _jwt.verify(jwt, process.env.KEY!);
            if(JSON.stringify(decrypted)!==JSON.stringify({
                transactionId
            })){
                throw new Error("Request forged");
            } else{
                return sign(await this.checkStatusService.checkStatus(transactionId));
            }
        } catch(e){
            // console.log(e);
            throw new UnauthorizedException();
        }
        
    }
}
