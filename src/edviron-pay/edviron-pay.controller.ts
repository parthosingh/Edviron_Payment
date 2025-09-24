import { BadRequestException, Body, ConflictException, Controller, Get, Post, Query } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { Installments } from 'src/database/schemas/installments.schema';
import { EdvironPayService } from './edviron-pay.service';
import { PlatformCharge } from 'src/database/schemas/platform.charges.schema';
import axios from 'axios';

@Controller('edviron-pay')
export class EdvironPayController {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly edvironPay: EdvironPayService
    ) { }

    @Post('installments')
    async upsertInstallments(@Body() body: any) {
        const {
            school_id,
            trustee_id,
            student_id,
            student_number,
            student_name,
            student_email,
            additional_data,
            amount,
            net_amount,
            discount,
            year,
            month,
            gateway,
            isInstallement,
            installments,
        } = body;


        if (isInstallement && installments && installments.length > 0) {
            await Promise.all(
                installments.map(async (installment: any) => {
                    const filter = {
                        school_id,
                        trustee_id,
                        student_id,
                        month: installment.month || month,
                        year: installment.year || year,
                    };

                    const existing = await this.databaseService.InstallmentsModel.findOne(filter);

                    if (!existing) {
                        // ✅ Create new installment
                        return this.databaseService.InstallmentsModel.create({
                            school_id,
                            trustee_id,
                            student_id,
                            student_number,
                            student_name,
                            student_email,
                            additional_data,
                            amount: installment.amount,
                            net_amount: installment.net_amount,
                            discount: installment.discount,
                            year: installment.year || year,
                            month: installment.month || month,
                            gateway,
                            fee_heads: installment.fee_heads,
                            status: 'unpaid', // default status
                            label: installment.label,
                            body: installment.body,
                        });
                    }

                    if (existing.status === 'paid') {
                        // ✅ Already paid → don’t overwrite
                        return existing;
                    }
                    console.log({ existing });

                    // ✅ Unpaid → update installment data
                    return this.databaseService.InstallmentsModel.updateOne(filter, {
                        $set: {
                            amount: installment.amount,
                            net_amount: installment.net_amount,
                            discount: installment.discount,
                            fee_head: installment.fee_head,
                            label: installment.label,
                            body: installment.body,
                            gateway,
                            additional_data,
                            student_number,
                            student_name,
                            student_email,
                            fee_heads: installment.fee_heads,
                        },
                    });
                }),
            );
        } else {
            throw new Error('No installments found or isInstallement is false');
        }
        console.log('Installments upserted successfully');
        return { status: 'installment updated successfully for student_id: ' + student_id };
    }

    @Post('collect-request')
    async collect(@Body() body: {
        isInstallment: boolean;
        InstallmentsIds: string[];
        school_id: string;
        trustee_id: string;
        callback_url: string;
        webhook_url: string;
        token: string;
        gateway: {
            cashfree: boolean;
            razorpay: boolean;
            easebuzz: boolean;
        };
        amount: number;
        disable_mode: string[];
        custom_order_id?: string;
        school_name: string;
        isSplit?: boolean;
        isVBAPayment?: boolean;
        vba_account_number: string;
        additional_data?: {};
        cashfree: {
            client_id: string;
            client_secret: string;
            api_key: string;
            isSeamless: boolean;
            isPartner: boolean;
            isVba: boolean;
            vba: {
                vba_account_number: string;
                vba_ifsc: string;
            },
            cashfreeVedors?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                },
            ];
        };
        razorpay: {
            key_id: string;
            key_secret: string;
            isSeamless: boolean;
            isPartner: boolean;
        };
        easebuzz: {
            mid: string;
            key: string;
            salt: string;
            isPartner: boolean;
            bank_label?: string;
            easebuzzVendors?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                },
            ];
        }

    }) {
        const {
            isInstallment, InstallmentsIds,
            school_id,
            trustee_id,
            callback_url,
            webhook_url,
            token,
            amount,
            disable_mode,
            custom_order_id,
            school_name,
            isSplit,
            isVBAPayment,
            additional_data,
            gateway,
            cashfree,
            razorpay,
            vba_account_number,
            easebuzz,
        } = body

        try {
            if (!token) {
                throw new Error('Token is required');
            }
            if (custom_order_id) {
                const count =
                    await this.databaseService.CollectRequestModel.countDocuments({
                        school_id,
                        custom_order_id,
                    });

                if (count > 0) {
                    throw new ConflictException('OrderId must be unique');
                }
            }

            if (isInstallment) {
                if (!InstallmentsIds || InstallmentsIds.length === 0) {
                    console.log(InstallmentsIds);

                    throw new Error('InstallmentsIds are required for installment payments');
                }

                // Fetch and validate installments
                const installments: Installments[] = await this.databaseService.InstallmentsModel.find({
                    _id: { $in: InstallmentsIds },
                    school_id,
                    trustee_id,
                    status: { $ne: 'paid' }
                });

                if (installments.length !== InstallmentsIds.length) {
                    throw new Error('Some installments are invalid or already paid');
                }

                console.log(cashfree, 'api cashfree');

                const cashfreeCred = {
                    cf_x_client_id: cashfree.client_id,
                    cf_x_client_secret: cashfree.client_secret,
                    cf_api_key: cashfree.api_key

                }

                const request = await this.databaseService.CollectRequestModel.create({
                    amount,
                    callbackUrl: callback_url,
                    gateway: Gateway.PENDING,
                    isCollectNow: true,
                    clientId: cashfree?.client_id || null,
                    clientSecret: cashfree?.client_secret || null,
                    disabled_modes: disable_mode,
                    school_id,
                    trustee_id,
                    additional_data: JSON.stringify(additional_data || {}),
                    custom_order_id,
                    req_webhook_urls: [webhook_url],
                    easebuzz_sub_merchant_id: easebuzz?.mid || null,
                    easebuzzVendors: easebuzz?.easebuzzVendors || [],
                    cashfreeVedors: cashfree?.cashfreeVedors || [],
                    isVBAPayment: isVBAPayment || false,
                    // vba_account_number: isVBAPayment ? cashfree?.vba?.vba_account_number : null,
                    school_name,
                    isSplitPayments: isSplit || false,
                    cashfree_credentials: cashfreeCred,
                    isCFNonSeamless: !cashfree?.isSeamless || false,
                    vba_account_number,

                })

                const requestStatus = await new this.databaseService.CollectRequestStatusModel({
                    collect_id: request._id,
                    status: PaymentStatus.PENDING,
                    order_amount: request.amount,
                    transaction_amount: request.amount,
                    payment_method: null,
                }).save();

                // Link installments to this collect request
                await this.databaseService.InstallmentsModel.updateMany(
                    { _id: { $in: InstallmentsIds } },
                    { $set: { collect_id: request._id, status: 'pending' } }
                );

                return await this.edvironPay.createOrder(request, school_name, gateway, PlatformCharge)
            }
        } catch (e) {
            console.log(e);
            throw new Error('Error occurred while processing payment: ' + e.message);
        }

    }

    @Get('/student-installments')
    async getStudentInstallments(
        @Query('student_id') student_id: string
    ) {
        try {
            const installments = await this.databaseService.InstallmentsModel.find({ student_id });

            installments.sort((a, b) => Number(a.month) - Number(b.month));

            return installments
        } catch (e) {

        }
    }

    @Post('/callback/cashfree')
    async getInstallCallbackCashfree(
        @Query('collect_id') collect_id: string
    ) {
        try {
            const request = await this.databaseService.CollectRequestModel.findById(collect_id)
            if (!request) {
                throw new BadRequestException('Invalid Collect id in Callback')
            }
            request.gateway = Gateway.EDVIRON_PG

        } catch (e) {

        }
    }

    @Get('/get-vendors')
    async getVendorsForSchool(@Query('school_id') school_id: string) {
        try {
            const config = {
                method: 'get',
                url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-vendors-list?school_id=${school_id}`,
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }

            const { data: vendors } = await axios.request(config)
            return vendors
        } catch (e) {
            console.log(e);

            throw new BadRequestException(e.message)
        }
    }
}
