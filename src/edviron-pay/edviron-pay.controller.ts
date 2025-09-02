import { Body, ConflictException, Controller, Post } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { Installments } from 'src/database/schemas/installments.schema';

@Controller('edviron-pay')
export class EdvironPayController {
    constructor(
        private readonly databaseService: DatabaseService,
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
        console.log({ isInstallement, installments });

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

        return { status: 'installment updated successfully for student_id: ' + student_id };
    }

    @Post('test')
    async testEndpoint(@Body() body: {
        isInatallment: boolean;
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
        school_name?: string;
        isSplit?: boolean;
        isVBAPayment?: boolean;
        additional_data?: {};
        cashfree: {
            client_id: string;
            api_key: string;
            client_secret: string;
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
            isInatallment, InstallmentsIds,
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

            if (isInatallment) {
                if (!InstallmentsIds || InstallmentsIds.length === 0) {
                    throw new Error('InstallmentsIds are required for installment payments');
                }
                // Fetch and validate installments
                const installments: Installments[] = await this.databaseService.InstallmentsModel.find({
                    _id: { $in: InstallmentsIds },
                    school_id,
                    trustee_id,
                    status: 'unpaid'
                });

                if (installments.length !== InstallmentsIds.length) {
                    throw new Error('Some installments are invalid or already paid');
                }

                const request = await this.databaseService.CollectRequestModel.create({
                    amount,
                    callbackUrl: callback_url,
                    school_id,
                    trustee_id,
                    disabled_modes: disable_mode,
                    req_webhook_urls: [webhook_url],
                    additional_data,
                    custom_order_id,
                    school_name,
                    isSplitPayments: isSplit || false,
                    isVBAPayment: isVBAPayment || false,
                    gateway: Gateway.PENDING,
                    easebuzzVendors: easebuzz?.easebuzzVendors || [],
                    cashfreeVedors: cashfree?.cashfreeVedors || [],
                    isCFNonSeamless: !cashfree?.isSeamless || false,
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
            }
        } catch (e) {
            throw new Error('Error occurred while processing payment: ' + e.message);
        }

    }
}
