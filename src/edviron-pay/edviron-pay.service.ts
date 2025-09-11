import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest, PaymentIds } from 'src/database/schemas/collect_request.schema';
import * as axios from 'axios';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
@Injectable()
export class EdvironPayService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cashfreeService: CashfreeService,
        private readonly easebuzzService: EasebuzzService,
    ) { }

    async createOrder(
        request: CollectRequest,
        school_name: string,
        gatewat: {
            cashfree: boolean,
            easebuzz: boolean,
            razorpay: boolean,
        },
        platform_charges: any
    ) {
        try {
            let paymentInfo: PaymentIds = {
                cashfree_id: null,
                easebuzz_id: null,
                easebuzz_cc_id: null,
                easebuzz_dc_id: null,
                ccavenue_id: null,
                easebuzz_upi_id: null,
            };
            const schoolName = school_name.replace(/ /g, '-');
            const collectReq = await this.databaseService.CollectRequestModel.findById(
                request._id,
            );
            if (!collectReq) {
                throw new BadRequestException('Collect Request not found');
            }
            if (gatewat.cashfree) {
                const cashfreeSessionId = await this.cashfreeService.createOrderCashfree(
                    request,
                    request.isSplitPayments,
                    request.cashfreeVedors
                )
                paymentInfo.cashfree_id = cashfreeSessionId;
                await collectReq.save()
            }

            let easebuzz_pg = false

            if (gatewat.easebuzz) {
                 easebuzz_pg = true
                const easebuzzSessionId = await this.easebuzzService.createOrderSeamlessNonSplit(
                    request,
                )
                paymentInfo.easebuzz_id = easebuzzSessionId;
                await collectReq.save()
            }
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            const encodedPlatformCharges = encodeURIComponent(
                JSON.stringify(platform_charges),
            );

            return {
        url:
          process.env.URL +
          '/edviron-pg/redirect?session_id=' +
          paymentInfo.cashfree_id +
          '&collect_request_id=' +
          request._id +
          '&amount=' +
          request.amount.toFixed(2) +
          '&' +
          disabled_modes_string +
          '&platform_charges=' +
          encodedPlatformCharges +
          '&school_name=' +
          schoolName +
          '&easebuzz_pg=' +
          easebuzz_pg +
          '&payment_id=' +
          paymentInfo.easebuzz_id,
      };
        } catch (err) {
            throw new BadRequestException(err.message);
        }
    }
}
