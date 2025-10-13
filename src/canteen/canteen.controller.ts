import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { CanteenService } from './canteen.service';
import { DatabaseService } from 'src/database/database.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import * as jwt from 'jsonwebtoken';
import { CheckStatusService } from 'src/check-status/check-status.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';

@Controller('canteen')
export class CanteenController {
    constructor(
        private readonly canteenService: CanteenService,
        private readonly databaseService: DatabaseService,
        private readonly edvironPgService: EdvironPgService,
        private readonly checkStatusService: CheckStatusService,
        private readonly cashfreeService: CashfreeService,
    ) { }

    @Post('create-collect-request')
    async createCanteenTransaction(
        @Body()
        body: {
            amount: Number;
            callbackUrl: string;
            sign: string;
            school_id: string;
            trustee_id: string;
            school_name: string;
            gateway: string[];
            canteen_id: string;
            cashfree_cred: {
                clientId: string;
                clientSecret: string;
                cf_api_key: string;
                cf_x_client_id: string;
                cf_x_client_secret: string;
                isVba: boolean
            }
            webHook?: string;
            disabled_modes?: string[];
            additional_data?: {};
            custom_order_id?: string;
            req_webhook_urls?: string[];
            split_payments?: boolean;
            vendors_info?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                },
            ];
        },
    ) {
        // Implementation for creating a canteen transaction
        try {
            const {
                amount,
                callbackUrl,
                sign,
                school_id,
                trustee_id,
                school_name,
                cashfree_cred,
                webHook,
                disabled_modes,
                additional_data,
                custom_order_id,
                req_webhook_urls,
                split_payments,
                gateway,
                vendors_info,
                canteen_id
            } = body

            if (!amount ||
                !callbackUrl ||
                !sign ||
                !school_id ||
                !trustee_id ||
                !school_name ||
                !gateway ||
                !canteen_id
            ) {

                throw new Error('Missing required fields');
            }

            const decoded = jwt.verify(sign, process.env.KEY!)
            if ((decoded as any).school_id !== school_id || (decoded as any).trustee_id !== trustee_id) {
                throw new Error('Request Forged')
            }
            if (gateway.length === 0) {
                throw new Error('Payment Gateway is not Active');
            }

            const request = await this.databaseService.CollectRequestModel.create({
                amount,
                callbackUrl,
                gateway: Gateway.PENDING,
                clientId: cashfree_cred.clientId,
                clientSecret: cashfree_cred.clientSecret,
                webHookUrl: webHook || null,
                disabled_modes,
                school_id,
                trustee_id,
                additional_data: JSON.stringify(additional_data),
                custom_order_id,
                req_webhook_urls,
                isCanteenTransaction: true,
                canteen_id,
                cashfree_credentials: {
                    cf_x_client_id: cashfree_cred.clientId,
                    cf_x_client_secret: cashfree_cred.clientSecret,
                    cf_api_key: cashfree_cred.cf_api_key,
                }
            });
            await new this.databaseService.CollectRequestStatusModel({
                collect_id: request._id,
                status: PaymentStatus.PENDING,
                order_amount: request.amount,
                transaction_amount: request.amount,
                payment_method: null,
            }).save();
            if (gateway.includes(Gateway.EDVIRON_PG)) {
                // Check if cashfree credentials are provided
                if (!cashfree_cred || !cashfree_cred.clientId || !cashfree_cred.clientSecret) {
                    throw new Error('Cashfree credentials are required for EDVIRON_PG gateway');
                }
                const pay_id = await this.cashfreeService.createOrderCashfree(
                    request
                )
                const disabled_modes_string = request.disabled_modes
                    .map((mode) => `${mode}=false`)
                    .join('&');
                const url = process.env.URL +
                    '/edviron-pg/redirect?session_id=' +
                    pay_id +
                    '&collect_request_id=' +
                    request._id +
                    '&amount=' +
                    request.amount.toFixed(2) +
                    '&' +
                    disabled_modes_string +
                    '&school_name=' +
                    school_name +
                    '&easebuzz_pg=' +
                    '&currency=' +
                    'INR'

                await this.databaseService.CollectRequestModel.updateOne(
                    {
                        _id: request._id,
                    },
                    {
                        payment_data: JSON.stringify(url),
                    },
                    { new: true },
                );
                return { url, request };
            }

        } catch (error) {
            console.error('Error creating canteen transaction:', error);
            throw error;
        }
    }

    @Post('check-status')
    async checkStatus(@Body() body: { collect_id: string, sign: string }) {
        const { collect_id, sign } = body;
        try {
            if (!collect_id || !sign) {
                throw new Error('Missing required fields');
            }
            const decoded = jwt.verify(sign, process.env.KEY!)
            if ((decoded as any).collect_id !== collect_id) {
                throw new Error('Request Forged | Invalid Sign')
            }
            const status = await this.checkStatusService.checkStatus(collect_id);
            return status;
        } catch (e) {
            throw new BadRequestException(e.message)
        }
    }
}