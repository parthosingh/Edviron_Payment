import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { stringify } from 'querystring';
import { decrypt, merchantKeySHA256 } from 'src/utils/sign';
import { encryptCard } from 'src/utils/sign';
@Controller('easebuzz')
export class EasebuzzController {
  constructor(
    //private readonly easebuzzService: EasebuzzService,
    private readonly databaseService: DatabaseService,
  ) {}
  @Get('/upiqr')
  async getQr(@Res() res: any, @Req() req: any) {
    try {
      const collect_id = req.query.collect_id;
      if (!collect_id) {
        throw new NotFoundException('collect_id not found');
      }

      const collectReq =
        await this.databaseService.CollectRequestModel.findById(
          collect_id,
        ).select('deepLink');

      if (!collectReq) {
        throw new NotFoundException('Collect request not found');
      }
      return res.send(collectReq.deepLink);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  @Get('/encrypted-info')
  async getEncryptedInfo(@Res() res: any, @Req() req: any, @Body() body: any) {
    const { card_number, card_holder, card_cvv, card_exp } = req.query;
    console.log('encrypting key and iv');
    const { key, iv } = await merchantKeySHA256();
    console.log('key and iv generated', { key, iv });

    console.log(`encrypting data: ${card_number}`);

    const enc_card_number = await encryptCard(card_number, key, iv);
    const enc_card_holder = await encryptCard(card_holder, key, iv);
    const enc_card_cvv = await encryptCard(card_cvv, key, iv);
    const enc_card_exp = await encryptCard(card_exp, key, iv);

    const decrypt_card_number = await decrypt(enc_card_number, key, iv);
    const decrypt_cvv = await decrypt(enc_card_cvv, key, iv);
    const decrypt_exp = await decrypt(enc_card_exp, key, iv);
    const decrypt_card_holder_name = await decrypt(enc_card_holder, key, iv);

    
    return res.send({
      card_number: enc_card_number,
      card_holder: enc_card_holder,
      card_cvv: enc_card_cvv,
      card_exp: enc_card_exp,
    });
  }
}
