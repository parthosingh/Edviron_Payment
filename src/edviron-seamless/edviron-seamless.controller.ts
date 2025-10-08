import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import * as jwt from 'jsonwebtoken'
import { EdvironSeamlessService } from './edviron-seamless.service';
@Controller('edviron-seamless')
export class EdvironSeamlessController {
    constructor(
        private readonly easebuzzService: EasebuzzService,
        private readonly databaseService: DatabaseService,
        private readonly edvironSeamlessService: EdvironSeamlessService,
    ) { }

    @Post('/initiate-payment')
    async initiatePayment(
        @Body() body: {
            school_id: string,
            trustee_id: string,
            token: string,
            mode: string,
            collect_id: string,
            amount: number,
            net_banking?: {
                bank_code: string
            },
            card: {
                enc_card_number: string,
                enc_card_holder_name: string,
                enc_card_cvv: string,
                enc_card_expiry_date: string
            },
            wallet: {
                bank_code: string,
            },
            pay_later: {
                bank_code: string
            },
            upi: {
                mode: string,
                vpa: string
            }
        },
        @Res() res: any
    ) {
        try {
            const {
                school_id,
                trustee_id,
                token,
                mode,
                collect_id,
                net_banking,
                card,
                wallet,
                pay_later,
                upi
            } = body
            const request = await this.databaseService.CollectRequestModel.findById(collect_id)
            if (!request) {
                throw new BadRequestException('Invalid Collect Id')
            }
            if (request?.school_id !== school_id || request.trustee_id !== trustee_id) {
                throw new BadRequestException("Unauthorized Access")
            }
            const access_key = request.paymentIds.easebuzz_id
            if (mode === 'NB') {
                if (
                    !net_banking ||
                    !net_banking.bank_code
                ) {
                    throw new BadRequestException('Required Parameter Missing')
                }
                const url = `${process.env.PG_FRONTEND}/seamless-pay/?mode=NB&school_id=${school_id}&access_key=${access_key}&mode=NB&code=${net_banking.bank_code}`
                return res.send({ url })
            } else if (mode === "CC" || mode === "DC") {
                const {
                    enc_card_number,
                    enc_card_holder_name,
                    enc_card_cvv,
                    enc_card_expiry_date,
                } = card
                const cardInfo = await this.edvironSeamlessService.processcards(
                    enc_card_number,
                    enc_card_holder_name,
                    enc_card_cvv,
                    enc_card_expiry_date,
                    school_id,
                    collect_id
                )
                const url = `${process.env.PG_FRONTEND}/seamless-pay?mode=${mode}&enc_card_number=${cardInfo.card_number}&enc_card_holder_name=${cardInfo.card_holder}&enc_card_cvv=${cardInfo.card_cvv}&enc_card_exp=${cardInfo.card_exp}&access_key=${access_key}`
                return res.send({ url })
            } else if (mode === "WALLET") {
                if (!wallet || !wallet.bank_code) {
                    throw new BadRequestException("Wallet bank code Required")
                }
                const url = `${process.env.PG_FRONTEND}/seamless-pay?mode=MW&bank_code=${wallet.bank_code}&access_key=${access_key}`
                return res.send({ url })
            } else if (mode === "PAY_LATER") {
                if (!pay_later || !pay_later.bank_code) {
                    throw new BadRequestException("Pay Later bank code Required")
                }
                const url = `${process.env.PG_FRONTEND}/seamless-pay?mode=PL&bank_code=${pay_later.bank_code}&access_key=${access_key}`
                return res.send({ url })
            } else if (mode === "UPI") {
                if (upi.mode === 'QR') {
                    const upiRes = await this.easebuzzService.getQrBase64(collect_id)
                    return res.send({
                        mode: "VPA",
                        upiRes
                    })
                } else if (upi.mode === "VPA") {
                    const url = `${process.env.PG_FRONTEND}/seamless-pay?mode=${mode}&vpa=${upi.vpa}&access_key=${access_key}`
                    return res.send({ url })
                }
            }
            else {
                throw new BadRequestException("Invalid Mode ")
            }
        } catch (e) {
            console.log(e);
            throw new BadRequestException(e.message)
        }
    }

    @Get('/test-nb')
    async testNB(
        @Req() req: any,
        @Res() res: any
    ) {
        try {
            const { collect_id, bank_code } = req.query
            const response = await this.easebuzzService.netBankingSeamless(collect_id, bank_code)
            return res.send(response)
        } catch (e) {
            throw new BadRequestException(e.message)
        }
    }

}
