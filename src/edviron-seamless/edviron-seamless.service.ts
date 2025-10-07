import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios'
import { url } from 'inspector';
import * as jwt from 'jsonwebtoken'
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { decrypt } from 'src/utils/sign';

@Injectable()
export class EdvironSeamlessService {
    constructor(
        private readonly easebuzzService: EasebuzzService,
    ) { }

    async processcards(
        enc_card_number: string,
        enc_card_holder_name: string,
        enc_card_cvv: string,
        enc_card_expiry_date: string,
        school_id: string,
        collect_id: string
    ): Promise<{ card_number: string, card_holder: string, card_cvv: string, card_exp: string }> {
        try {
            console.log("debug");

            const sign = jwt.sign({ school_id }, process.env.KEY!)
            const config = {
                method: 'get',
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-key-iv?school_id=${school_id}&sign=${sign}`,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }

            const { data: info } = await axios.request(config)
            console.log(info, 'info');

            const { key, iv } = info
            const card_number = await decrypt(enc_card_number, key, iv)
            const card_holder_name = await decrypt(enc_card_holder_name, key, iv)
            const card_cvv = await decrypt(enc_card_cvv, key, iv)
            const card_expiry_date = await decrypt(enc_card_expiry_date, key, iv)

            return await this.easebuzzService.easebuzzEncryption(
                card_number,
                card_holder_name,
                card_cvv,
                card_expiry_date,
                collect_id
            )

        } catch (e) {
            console.log(e);

            throw new BadRequestException(e.message)

        }
    }
}
