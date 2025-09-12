import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Non_Seamless_Payment_Links } from 'src/database/schemas/collect_request.schema';

@Controller('gateway')
export class GatewayController {
    constructor(
        private readonly databaseService: DatabaseService
    ) { }

    @Get('/get-links')
    async getGatewayLinks(
        @Query('collect_id') collect_id: string
    ): Promise<{
        edviron_gateways:{
            cashfree:string|null,
            easebuzz :string | null,
            razopay:string|null
        } | {}, 
        banks_gateways: Non_Seamless_Payment_Links |{}} | null> {
        try {
            if (!collect_id) {
                throw new BadRequestException('Collect id missing')
            }
            const request = await this.databaseService.CollectRequestModel.findById(collect_id)
            if (!request) {
                throw new BadRequestException('invalid collect_id')
            }
            if (!request.isMasterGateway || !request.non_seamless_payment_links) {
                throw new BadRequestException('Master gateway not enabled')
            }
            let edviron_gateways={
                cashfree:null as string | null,
                easebuzz:null as string | null,
                razorpay:null as string | null
            }
            if(request.paymentIds?.cashfree_id){
                edviron_gateways.cashfree=`${request.non_seamless_payment_links.edviron_pg}&gateway=cashfree`
            }
            if(request.paymentIds?.easebuzz_id){
                edviron_gateways.easebuzz=`${request.non_seamless_payment_links.edv_easebuzz}&gateway=easebuzz`
            }
            // handle razorpay seamless after implementing
            return {
                edviron_gateways,
                banks_gateways: request.non_seamless_payment_links || {}
            }

        } catch (e) {
            throw new BadRequestException(e.message)
        }
    }
}
