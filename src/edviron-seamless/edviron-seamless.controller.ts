import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';

@Controller('edviron-seamless')
export class EdvironSeamlessController {
    constructor(
        private readonly easebuzzService: EasebuzzService,
        private readonly databaseService: DatabaseService,
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
                net_banking
            } = body

            const request = await this.databaseService.CollectRequestModel.findById(collect_id)
            if (!request) {
                throw new BadRequestException('Invalid Collect Id')
            }
            if (request?.school_id !== school_id || request.trustee_id !== trustee_id) {
                throw new BadRequestException("Unauthorized Access")
            }
            if (mode === 'NB') {
                if (
                    !net_banking ||
                    !net_banking.bank_code
                ) {
                    throw new BadRequestException('Required Parameter Missing')
                }

                const response = await this.easebuzzService.netBankingSeamless(collect_id, net_banking.bank_code)
                return res.send(response)
            }
        } catch (e) {
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

        }
    }

}
