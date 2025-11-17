import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  EdvironPayPaymentStatus,
  PaymentStatus,
} from 'src/database/schemas/collect_req_status.schema';
import {
  Gateway,
  PaymentIds,
} from 'src/database/schemas/collect_request.schema';
import { Installments } from 'src/database/schemas/installments.schema';
import { EdvironPayService } from './edviron-pay.service';
import { PlatformCharge } from 'src/database/schemas/platform.charges.schema';
import axios from 'axios';
import * as _jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';

@Controller('edviron-pay')
export class EdvironPayController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly edvironPay: EdvironPayService,
    private readonly edvironPgService: EdvironPgService,
  ) {}

  @Post('installments')
  async upsertInstallments(@Body() body: any) {
    try {
      const {
        school_id,
        trustee_id,
        student_detail,
        additional_data,
        amount,
        net_amount,
        discount,
        year,
        month,
        gateway,
        isInstallement,
        installments,
        allvendors,
        cashfreeVedors,
        easebuzzVendors,
        callback_url,
        webhook_url,
        sign,
      } = body;

      const { student_id, student_number, student_name, student_email } =
        student_detail;
      await this.edvironPay.createStudent(
        student_detail,
        school_id,
        trustee_id,
      );

      if (isInstallement && installments && Array.isArray(installments)) {
        const studentId = student_id; // ensure this is available in scope

        // Fetch all installments of that student once
        const allInstallments =
          await this.databaseService.InstallmentsModel.find({
            student_id: studentId,
          }).lean();

        for (const installment of installments) {
          const currentMonth = Number(installment.month);
          const currentYear = Number(installment.year);

          // Filter only previous installments (before current month/year)
          const previousInstallments = allInstallments.filter(
            (inst) =>
              Number(inst.year) < currentYear ||
              (Number(inst.year) === currentYear &&
                Number(inst.month) < currentMonth),
          );

          if (previousInstallments && previousInstallments.length > 0) {
            // Only check if the current installment isPaid = true
            if (installment.isPaid === true) {
              const unpaid = previousInstallments.find(
                (inst) => inst.status === 'unpaid',
              );

              if (unpaid) {
                throw new BadRequestException(
                  `Cannot mark installment for ${installment.month}/${installment.year} as paid because a previous installment (${unpaid.month}/${unpaid.year}) is still unpaid.`,
                );
              }
            }

            // Similarly, only check preSelected if current one is true
            if (installment.preSelected === true) {
              const preselect = previousInstallments.find(
                (inst) =>
                  inst.status !== 'paid' && // ignore paid installments
                  (inst.preSelected === false ||
                    inst.preSelected === undefined),
              );

              if (preselect) {
                throw new BadRequestException(
                  `Cannot mark installment for ${installment.month}/${installment.year} as preSelected because a previous installment (${preselect.month}/${preselect.year}) is not preSelected.`,
                );
              }
            }
          }
        }
      }

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
            const { split_payments, vendors_info } = installment;

            const existing =
              await this.databaseService.InstallmentsModel.findOne(filter);

            const vendorsBlock = split_payments
              ? {
                  vendors_info: allvendors,
                  cashfreeVedors: cashfreeVedors,
                  easebuzzVendors: easebuzzVendors,
                }
              : {};

            if (!existing) {
              let newinstallment;
              if (installment.isPaid) {
                let mode = installment.payment_mode;
                console.log(mode, 'mode', installment?.payment_detail, 'test');
                if (!mode) {
                  throw new BadRequestException('payment mode required');
                }
                let detail;
                let payment_method;

                switch (mode) {
                  case 'demand_draft':
                    payment_method = 'demand_draft';
                    detail = {
                      demand_draft: {
                        dd_number:
                          installment?.payment_detail?.dd_detail?.dd_number ||
                          'N/A',
                        bank_name:
                          installment?.payment_detail?.dd_detail?.bank_name ||
                          'N/A',
                        branch_name:
                          installment?.payment_detail?.dd_detail?.branch_name ||
                          'N/A',
                        depositor_name:
                          installment?.payment_detail?.dd_detail
                            ?.depositor_name || 'N/A',
                        remarks:
                          installment?.payment_detail?.dd_detail?.remark ||
                          'N/A',
                      },
                    };
                    break;

                  case 'CASH':
                    payment_method = 'cash';
                    detail = {
                      cash: {
                        amount,
                        notes:
                          installment?.payment_detail?.cash_detail?.notes || {},
                        depositor_name:
                          installment?.payment_detail?.cash_detail
                            ?.depositor_name || 'N/A',
                        collector_name:
                          installment?.payment_detail?.cash_detail
                            ?.collector_name || 'N/A',
                        remark:
                          installment?.payment_detail?.cash_detail?.remark ||
                          'N/A',
                        date:
                          installment?.payment_detail?.cash_detail?.date ||
                          'N/A',
                        total_cash_amount:
                          installment?.payment_detail?.cash_detail
                            ?.total_cash_amount || 'N/A',
                      },
                    };
                    break;

                  case 'STATIC_QR':
                    payment_method = 'upi';
                    detail = {
                      upi: {
                        amount,
                        upi_id:
                          installment?.payment_detail?.static_qr?.upiId || {},
                        transaction_amount:
                          installment?.payment_detail?.static_qr
                            ?.transactionAmount || 'N/A',
                        bank_ref:
                          installment?.payment_detail?.static_qr
                            ?.bankReferenceNo || 'N/A',
                        app_name:
                          installment?.payment_detail?.static_qr?.appName ||
                          'N/A',
                      },
                    };
                    break;

                  case 'cheque':
                    payment_method = 'cheque';
                    detail = {
                      cheque: {
                        cheque_no:
                          installment?.payment_detail?.cheque_detail?.chequeNo,
                        date_on_cheque:
                          installment?.payment_detail?.cheque_detail
                            ?.dateOnCheque,
                        amount,
                        remarks:
                          installment?.payment_detail?.cheque_detail?.remarks ||
                          'N/A',
                        payer: {
                          account_holder_name:
                            installment?.payment_detail?.cheque_detail
                              ?.accountHolderName || 'N/A',
                          bank_name:
                            installment?.payment_detail?.cheque_detail
                              ?.bankName || 'N/A',
                        },
                      },
                    };
                    break;

                  case 'upi':
                    if (!installment?.payment_detail?.upi?.upi_id) {
                      throw new BadRequestException('upi id is required');
                    }
                    payment_method = 'upi';
                    detail = {
                      upi: {
                        channel: null,
                        upi_id: installment?.payment_detail?.upi?.upi_id,
                      },
                    };
                    break;

                  case 'credit_card':
                    if (
                      !installment?.payment_detail?.card?.card_bank_name ||
                      !installment?.payment_detail?.card?.card_network ||
                      !installment?.payment_detail?.card?.card_number ||
                      !installment?.payment_detail?.card?.card_type
                    ) {
                      throw new BadRequestException(
                        'All credit card details are required',
                      );
                    }
                    payment_method = 'credit_card';
                    detail = {
                      card: {
                        card_bank_name:
                          installment.payment_detail.card.card_bank_name,
                        card_network:
                          installment.payment_detail.card.card_network,
                        card_number:
                          installment.payment_detail.card.card_number,
                        card_type: installment.payment_detail.card.card_type,
                      },
                    };
                    break;

                  case 'debit_card':
                    if (
                      !installment?.payment_detail?.card?.card_bank_name ||
                      !installment?.payment_detail?.card?.card_network ||
                      !installment?.payment_detail?.card?.card_number ||
                      !installment?.payment_detail?.card?.card_type
                    ) {
                      throw new BadRequestException(
                        'All debit card details are required',
                      );
                    }
                    payment_method = 'debit_card';
                    detail = {
                      card: {
                        card_bank_name:
                          installment.payment_detail.card.card_bank_name,
                        card_network:
                          installment.payment_detail.card.card_network,
                        card_number:
                          installment.payment_detail.card.card_number,
                        card_type: installment.payment_detail.card.card_type,
                      },
                    };
                    break;

                  case 'net_banking':
                    if (
                      !installment?.payment_detail?.net_banking
                        ?.netbanking_bank_code ||
                      !installment?.payment_detail?.net_banking
                        ?.netbanking_bank_name
                    ) {
                      throw new BadRequestException(
                        'Net banking bank code and name are required',
                      );
                    }
                    payment_method = 'net_banking';
                    detail = {
                      netbanking: {
                        channel: null,
                        netbanking_bank_code:
                          installment.payment_detail.net_banking
                            .netbanking_bank_code,
                        netbanking_bank_name:
                          installment.payment_detail.net_banking
                            .netbanking_bank_name,
                      },
                    };
                    break;

                  case 'wallet':
                    if (!installment?.payment_detail?.wallet?.provider) {
                      throw new BadRequestException(
                        'Wallet provider is required',
                      );
                    }
                    payment_method = 'wallet';
                    detail = {
                      wallet: {
                        channel: null,
                        provider: installment.payment_detail.wallet.provider,
                      },
                    };
                    break;

                  default: {
                  }
                }

                const request =
                  await this.databaseService.CollectRequestModel.create({
                    amount: installment.net_amount,
                    callbackUrl: callback_url,
                    gateway: Gateway.EDVIRON_PAY,
                    isCollectNow: true,
                    school_id,
                    trustee_id,
                    additional_data: JSON.stringify(additional_data || {}),
                    req_webhook_urls: [webhook_url],
                    easebuzzVendors: easebuzzVendors || [],
                    cashfreeVedors: cashfreeVedors || [],
                    // vba_account_number: isVBAPayment ? cashfree?.vba?.vba_account_number : null,
                  });

                const requestStatus =
                  await new this.databaseService.CollectRequestStatusModel({
                    collect_id: request._id,
                    status: PaymentStatus.SUCCESS,
                    order_amount: request.amount,
                    transaction_amount: request.amount,
                    payment_method: payment_method,
                    details: JSON.stringify(detail),
                    bank_reference:
                      installment.payment_detail.bank_reference_number || '',
                  }).save();
                newinstallment =
                  await this.databaseService.InstallmentsModel.create({
                    school_id,
                    trustee_id,
                    student_id,
                    student_number,
                    student_name,
                    student_email,
                    additional_data,
                    callback_url,
                    webhook_url,
                    amount: installment.amount,
                    net_amount: installment.net_amount,
                    discount: installment.discount,
                    year: installment.year || year,
                    month: installment.month || month,
                    gateway,
                    fee_heads: installment.fee_heads,
                    status: 'paid', // default status
                    label: installment.label,
                    preSelected: installment.preSelected || false,
                    body: installment.body,
                    isSplitPayments: split_payments,
                    collect_id: request._id,
                    ...vendorsBlock,
                  });
              } else {
                newinstallment =
                  await this.databaseService.InstallmentsModel.create({
                    school_id,
                    trustee_id,
                    student_id,
                    student_number,
                    student_name,
                    student_email,
                    additional_data,
                    callback_url,
                    webhook_url,
                    amount: installment.amount,
                    net_amount: installment.net_amount,
                    discount: installment.discount,
                    year: installment.year || year,
                    month: installment.month || month,
                    gateway,
                    fee_heads: installment.fee_heads,
                    status: 'unpaid', // default status
                    label: installment.label,
                    preSelected: installment.preSelected || false,
                    body: installment.body,
                    isSplitPayments: split_payments,
                    ...vendorsBlock,
                  });
              }
              return newinstallment;
            }

            if (existing.status === 'paid') {
              // ✅ Already paid → don’t overwrite
              return existing;
            }
            let updateExisting;
            if (installment.isPaid) {
              let mode = installment.payment_mode;
              if (!mode) {
                throw new BadRequestException('payment mode required');
              }
              let detail;
              let payment_method;

              switch (mode) {
                case 'demand_draft':
                  payment_method = 'demand_draft';
                  detail = {
                    demand_draft: {
                      dd_number:
                        installment?.payment_detail?.dd_detail?.dd_number ||
                        'N/A',
                      bank_name:
                        installment?.payment_detail?.dd_detail?.bank_name ||
                        'N/A',
                      branch_name:
                        installment?.payment_detail?.dd_detail?.branch_name ||
                        'N/A',
                      depositor_name:
                        installment?.payment_detail?.dd_detail
                          ?.depositor_name || 'N/A',
                      remarks:
                        installment?.payment_detail?.dd_detail?.remark || 'N/A',
                    },
                  };
                  break;

                case 'upi':
                  if (!installment?.payment_detail?.upi?.upi_id) {
                    throw new BadRequestException('upi id is required');
                  }
                  payment_method = 'upi';
                  detail = {
                    upi: {
                      channel: null,
                      upi_id: installment?.payment_detail?.upi?.upi_id,
                    },
                  };
                  break;

                case 'credit_card':
                  if (
                    !installment?.payment_detail?.card?.card_bank_name ||
                    !installment?.payment_detail?.card?.card_network ||
                    !installment?.payment_detail?.card?.card_number ||
                    !installment?.payment_detail?.card?.card_type
                  ) {
                    throw new BadRequestException(
                      'All credit card details are required',
                    );
                  }
                  payment_method = 'credit_card';
                  detail = {
                    card: {
                      card_bank_name:
                        installment.payment_detail.card.card_bank_name,
                      card_network:
                        installment.payment_detail.card.card_network,
                      card_number: installment.payment_detail.card.card_number,
                      card_type: installment.payment_detail.card.card_type,
                    },
                  };
                  break;

                case 'debit_card':
                  if (
                    !installment?.payment_detail?.card?.card_bank_name ||
                    !installment?.payment_detail?.card?.card_network ||
                    !installment?.payment_detail?.card?.card_number ||
                    !installment?.payment_detail?.card?.card_type
                  ) {
                    throw new BadRequestException(
                      'All debit card details are required',
                    );
                  }
                  payment_method = 'debit_card';
                  detail = {
                    card: {
                      card_bank_name:
                        installment.payment_detail.card.card_bank_name,
                      card_network:
                        installment.payment_detail.card.card_network,
                      card_number: installment.payment_detail.card.card_number,
                      card_type: installment.payment_detail.card.card_type,
                    },
                  };
                  break;

                case 'net_banking':
                  if (
                    !installment?.payment_detail?.net_banking
                      ?.netbanking_bank_code ||
                    !installment?.payment_detail?.net_banking
                      ?.netbanking_bank_name
                  ) {
                    throw new BadRequestException(
                      'Net banking bank code and name are required',
                    );
                  }
                  payment_method = 'net_banking';
                  detail = {
                    netbanking: {
                      channel: null,
                      netbanking_bank_code:
                        installment.payment_detail.net_banking
                          .netbanking_bank_code,
                      netbanking_bank_name:
                        installment.payment_detail.net_banking
                          .netbanking_bank_name,
                    },
                  };
                  break;

                case 'wallet':
                  if (!installment?.payment_detail?.wallet?.provider) {
                    throw new BadRequestException(
                      'Wallet provider is required',
                    );
                  }
                  payment_method = 'wallet';
                  detail = {
                    wallet: {
                      channel: null,
                      provider: installment.payment_detail.wallet.provider,
                    },
                  };
                  break;

                default: {
                }
              }

              const request =
                await this.databaseService.CollectRequestModel.create({
                  amount: installment.net_amount,
                  callbackUrl: callback_url,
                  gateway: Gateway.EDVIRON_PAY,
                  isCollectNow: true,
                  school_id,
                  trustee_id,
                  additional_data: JSON.stringify(additional_data || {}),
                  req_webhook_urls: [webhook_url],
                  easebuzzVendors: easebuzzVendors || [],
                  cashfreeVedors: cashfreeVedors || [],
                  // vba_account_number: isVBAPayment ? cashfree?.vba?.vba_account_number : null,
                });

              const requestStatus =
                await new this.databaseService.CollectRequestStatusModel({
                  collect_id: request._id,
                  status: PaymentStatus.SUCCESS,
                  order_amount: request.amount,
                  transaction_amount: request.amount,
                  payment_method: payment_method,
                  details: JSON.stringify(detail),
                  bank_reference:
                    installment.payment_detail.bank_reference_number || '',
                }).save();

              updateExisting =
                await this.databaseService.InstallmentsModel.findOneAndUpdate(
                  filter,
                  {
                    $set: {
                      collect_id: request._id,
                      status: 'paid',
                    },
                  },
                );
            } else {
              updateExisting =
                await this.databaseService.InstallmentsModel.updateOne(filter, {
                  $set: {
                    amount: installment.amount,
                    net_amount: installment.net_amount,
                    discount: installment.discount,
                    fee_head: installment.fee_head,
                    label: installment.label,
                    preSelected: installment.preSelected || false,
                    body: installment.body,
                    gateway,
                    callback_url,
                    webhook_url,
                    additional_data,
                    student_number,
                    student_name,
                    student_email,
                    fee_heads: installment.fee_heads,
                    status: 'unpaid',
                    isSplitPayments: split_payments,
                    ...vendorsBlock,
                  },
                });
            }

            return updateExisting;
          }),
        );
      } else {
        throw new Error('No installments found or isInstallement is false');
      }
      console.log('Installments upserted successfully');
      return {
        status:
          'installment updated successfully for student_id: ' + student_id,
        student_id: student_id,
        school_id: school_id,
        url: `${process.env.PG_FRONTEND}/collect-fee?student_id=${student_id}&school_id=${school_id}&trustee_id=${trustee_id}`,
      };
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException(error.response);
    }
  }

  @Get('installment-payments')
  async getInstallmentPayments(@Req() req: any) {
    try {
      const { student_id, school_id } = req.query;
      const checkStudent =
        await this.databaseService.StudentDetailModel.findOne({
          student_id,
          school_id: new Types.ObjectId(school_id),
        });
      if (!checkStudent) {
        throw new BadRequestException('Student not found');
      }

      const config = {
        method: 'get',
        url: `${process.env.VANILLA_SERVICE}/erp/installment-sign?school_id=${checkStudent?.school_id}&trustee_id=${checkStudent?.trustee_id}&student_id=${student_id}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': '2023-08-01',
        },
      };
      const { data } = await axios.request(config);
      const url = `${process.env.PG_FRONTEND}/collect-fee?student_id=${student_id}&school_id=${checkStudent?.school_id}&trustee_id=${checkStudent?.trustee_id}&token=${data.sign}`;
      return { url };
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Post('collect-request')
  async collect(
    @Body()
    body: {
      mode: string;
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
        };
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
        easebuzz_merchant_email: string;
        bank_label?: string;
        easebuzzVendors?: [
          {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
          },
        ];
      };
      student_detail: {
        student_id: string;
        student_name: string;
        student_number: string;
        student_email: string;
      };
      easebuzzVendors?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
        },
      ];
      cashfreeVedors?: [
        {
          vendor_id: string;
          percentage?: number;
          amount?: number;
          name?: string;
        },
      ];
      razorpay_vendors?: [
        {
          vendor_id: string;
          account?: string;
          percentage?: number;
          amount?: number;
          notes?: {
            branch?: string;
            name?: string;
          };
          linked_account_notes?: string[];
          on_hold?: boolean;
          on_hold_until?: Date;
        },
      ];
      cash_detail?: {
        note: {
          [denomination: number]: number;
        };
        total_cash_amount?: number;
        amount?: number;
        depositor_name?: string;
        collector_name?: string;
        date?: Date;
        remark?: string;
      };
      dd_detail?: {
        amount: number;
        dd_number: string;
        bank_name: string;
        branch_name: string;
        depositor_name?: string;
        date?: Date;
        remark?: string;
      };
      document_url?: string | null;
      static_qr?: {
        upiId: string;
        transactionAmount: number | string;
        bankReferenceNo: string;
        appName?: string;
      };
      netBankingDetails?: {
        utr: string;
        amount: string;
        remarks: string;
        payer: {
          bank_holder_name: string;
          bank_name: string;
          ifsc: string;
          account_no: string;
        };
        recivers: {
          bank_holder_name: string;
          bank_name: string;
          ifsc: string;
        };
      };
      cheque_detail?: {
        accountHolderName: string;
        bankName: string;
        chequeNo: string;
        dateOnCheque: string;
        remarks?: string;
      };
      parents_info: {
        name: string;
        phone: string;
        email: string;
        relationship: string;
      };
      date?: string;
      remark?: string;
    },
    @Req() req?: any,
    @Res() res?: any,
  ) {
    const {
      mode,
      isInstallment,
      InstallmentsIds,
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
      easebuzzVendors,
      cashfreeVedors,
      razorpay_vendors,
      cash_detail,
      dd_detail,
      document_url,
      student_detail,
      static_qr,
      netBankingDetails,
      cheque_detail,
      date,
      parents_info,
      remark,
    } = body;

    try {
      let { student_id, student_name, student_email, student_number } =
        student_detail;
      if (!token) {
        throw new Error('Token is required');
      }

      const decrypt = _jwt.verify(token, process.env.KEY!) as any;
      console.log(decrypt, 'decrypt');
      if (decrypt.school_id.toString() !== school_id.toString()) {
        throw new BadRequestException('Request fordge');
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

          throw new Error(
            'InstallmentsIds are required for installment payments',
          );
        }

        // Fetch and validate installments
        const installments: Installments[] =
          await this.databaseService.InstallmentsModel.find({
            _id: { $in: InstallmentsIds },
            school_id,
            trustee_id,
            status: { $ne: 'paid' },
          });

        if (installments.length !== InstallmentsIds.length) {
          throw new Error('Some installments are invalid or already paid');
        }
        const cashfreeCred = {
          cf_x_client_id: cashfree.client_id,
          cf_x_client_secret: cashfree.client_secret,
          cf_api_key: cashfree.api_key,
        };

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
          easebuzz_non_partner_cred: {
            easebuzz_salt: easebuzz.salt,
            easebuzz_key: easebuzz.key,
            easebuzz_merchant_email: easebuzz.easebuzz_merchant_email,
            easebuzz_submerchant_id: easebuzz.mid,
          },
          easebuzzVendors: easebuzzVendors || [],
          cashfreeVedors: cashfreeVedors || [],
          razorpay_vendors_info: razorpay_vendors,
          isVBAPayment: isVBAPayment || false,
          // vba_account_number: isVBAPayment ? cashfree?.vba?.vba_account_number : null,
          school_name,
          isSplitPayments: isSplit || false,
          cashfree_credentials: cashfreeCred,
          isCFNonSeamless: !cashfree?.isSeamless || false,
          vba_account_number,
          document_url,
        });

        const requestStatus =
          await new this.databaseService.CollectRequestStatusModel({
            collect_id: request._id,
            status: PaymentStatus.PENDING,
            order_amount: request.amount,
            transaction_amount: request.amount,
            payment_method: null,
          }).save();

        let student_details = await new this.databaseService.StudentDetailModel(
          {
            student_id: student_id,
            student_name,
            trustee_id,
            school_id,
            student_email,
            student_number,
          },
        ).save();

        await this.databaseService.InstallmentsModel.updateMany(
          { _id: { $in: InstallmentsIds } },
          { $set: { collect_id: request._id, status: 'pending' } },
        );
        if (mode === 'EDVIRON_CASH') {
          let collectIdObject = request._id;
          const detail = {
            cash: {
              amount,
              notes: cash_detail?.note || {},
              depositor_name: cash_detail?.depositor_name || 'N/A',
              collector_name: cash_detail?.collector_name || 'N/A',
              remark: cash_detail?.remark || remark || 'N/A',
              date: cash_detail?.date || 'N/A',
              total_cash_amount: cash_detail?.total_cash_amount || 'N/A',
            },
          };
          await this.databaseService.CollectRequestModel.updateOne(
            {
              _id: collectIdObject,
            },
            {
              $set: {
                gateway: Gateway.EDVIRON_PAY,
              },
            },
          );
          const updateReq =
            await this.databaseService.CollectRequestStatusModel.updateOne(
              {
                collect_id: collectIdObject,
              },
              {
                $set: {
                  status: 'SUCCESS',
                  payment_time: cash_detail?.date
                    ? new Date(cash_detail?.date).toISOString()
                    : new Date().toISOString(),
                  transaction_amount: amount,
                  payment_method: 'cash',
                  details: JSON.stringify(detail),
                  bank_reference: 'N/A',
                  reason: `payment successfully collected by ${
                    (cash_detail && cash_detail?.collector_name) || 'school'
                  }`,
                  payment_message: `payment successfully collected by ${
                    (cash_detail && cash_detail?.collector_name) || 'school'
                  }`,
                },
              },
              {
                upsert: true,
                new: true,
              },
            );

          const updateinstallments =
            await this.databaseService.InstallmentsModel.updateMany(
              {
                _id: { $in: InstallmentsIds },
                school_id,
                trustee_id,
              },
              {
                $set: {
                  status: 'paid',
                  payment_time: cash_detail?.date
                    ? new Date(cash_detail?.date).toISOString()
                    : new Date().toISOString(),
                },
              },
            );

          const callbackUrl = new URL(request.callbackUrl);
          callbackUrl.searchParams.set('status', 'SUCCESS');
          return res.json({ redirectUrl: callbackUrl.toString() });
        }
        if (mode === 'EDVIRON_STATIC_QR') {
          let collectIdObject = request._id;
          const detail = {
            upi: {
              amount,
              upi_id: static_qr?.upiId || {},
              transaction_amount: static_qr?.transactionAmount || 'N/A',
              bank_ref: static_qr?.bankReferenceNo || 'N/A',
              app_name: static_qr?.appName || 'N/A',
              remark: remark || 'N/A',
            },
          };
          await this.databaseService.CollectRequestModel.updateOne(
            {
              _id: collectIdObject,
            },
            {
              $set: {
                gateway: Gateway.EDVIRON_PAY,
              },
            },
          );
          const updateReq =
            await this.databaseService.CollectRequestStatusModel.updateOne(
              {
                collect_id: collectIdObject,
              },
              {
                $set: {
                  status: 'SUCCESS',
                  payment_time: date
                    ? new Date(date).toISOString()
                    : new Date().toISOString(),
                  transaction_amount: amount,
                  payment_method: 'upi',
                  details: JSON.stringify(detail),
                  bank_reference: static_qr?.bankReferenceNo || 'N/A',
                  reason: `payment successfull with static upi`,
                  payment_message: `payment successfull with static upi`,
                },
              },
              {
                upsert: true,
                new: true,
              },
            );

          const updateinstallments =
            await this.databaseService.InstallmentsModel.updateMany(
              {
                _id: { $in: InstallmentsIds },
                school_id,
                trustee_id,
              },
              {
                $set: {
                  status: 'paid',
                  payment_time: date
                    ? new Date(date).toISOString()
                    : new Date().toISOString(),
                },
              },
            );

          const callbackUrl = new URL(request.callbackUrl);
          callbackUrl.searchParams.set('status', 'SUCCESS');
          return res.json({ redirectUrl: callbackUrl.toString() });
        }
        if (mode === 'DEMAND_DRAFT') {
          let collectIdObject = request._id;
          const detail = {
            demand_draft: {
              amount,
              dd_number: dd_detail?.dd_number || 'N/A',
              bank_name: dd_detail?.bank_name || 'N/A',
              branch_name: dd_detail?.branch_name || 'N/A',
              depositor_name: dd_detail?.depositor_name || 'N/A',
              remarks: dd_detail?.remark || remark || 'N/A',
            },
          };
          await this.databaseService.CollectRequestModel.updateOne(
            {
              _id: collectIdObject,
            },
            {
              $set: {
                gateway: Gateway.EDVIRON_PAY,
              },
            },
          );
          const updateReq =
            await this.databaseService.CollectRequestStatusModel.updateOne(
              {
                collect_id: collectIdObject,
              },
              {
                $set: {
                  status: 'SUCCESS',
                  payment_time: dd_detail?.date
                    ? new Date(dd_detail?.date).toISOString()
                    : new Date().toISOString(),
                  transaction_amount: amount,
                  payment_method: 'demand_draft',
                  details: JSON.stringify(detail),
                  bank_reference: dd_detail?.dd_number || 'N/A',
                  reason: `Payment successfully collected via Demand Draft ${
                    dd_detail?.dd_number
                      ? `(DD No: ${dd_detail.dd_number})`
                      : ''
                  } from ${dd_detail?.depositor_name || 'payer'}`,
                  payment_message: `Payment successfully collected via Demand Draft ${
                    dd_detail?.dd_number
                      ? `(DD No: ${dd_detail.dd_number})`
                      : ''
                  } from ${dd_detail?.depositor_name || 'payer'}`,
                },
              },
              {
                upsert: true,
                new: true,
              },
            );

          const updateinstallments =
            await this.databaseService.InstallmentsModel.updateMany(
              {
                _id: { $in: InstallmentsIds },
                school_id,
                trustee_id,
              },
              {
                $set: {
                  status: 'paid',
                  payment_time: dd_detail?.date
                    ? new Date(dd_detail?.date).toISOString()
                    : new Date().toISOString(),
                },
              },
            );

          const callbackUrl = new URL(request.callbackUrl);
          callbackUrl.searchParams.set('status', 'SUCCESS');
          return res.json({ redirectUrl: callbackUrl.toString() });
        }
        if (mode === 'EDVIRON_NETBANKING') {
          let collectIdObject = request._id;
          const detail = {
            net_banking: {
              utr: netBankingDetails?.utr,
              amount,
              transaction_amount: amount,
              remarks: netBankingDetails?.remarks || remark || 'N/A',
              payer: {
                bank_holder_name:
                  netBankingDetails?.payer?.bank_holder_name || 'N/A',
                bank_name: netBankingDetails?.payer?.bank_name || 'N/A',
                ifsc: netBankingDetails?.payer?.ifsc || 'N/A',
                account_no: netBankingDetails?.payer?.account_no || 'N/A',
              },
              recivers: {
                bank_holder_name:
                  netBankingDetails?.recivers.bank_holder_name || 'N/A',
                bank_name: netBankingDetails?.recivers.bank_name || 'N/A',
                ifsc: netBankingDetails?.recivers.ifsc || 'N/A',
              },
            },
          };
          await this.databaseService.CollectRequestModel.updateOne(
            {
              _id: collectIdObject,
            },
            {
              $set: {
                gateway: Gateway.EDVIRON_PAY,
              },
            },
          );
          const updateReq =
            await this.databaseService.CollectRequestStatusModel.updateOne(
              {
                collect_id: collectIdObject,
              },
              {
                $set: {
                  status: 'SUCCESS',
                  payment_time: date
                    ? new Date(date).toISOString()
                    : new Date().toISOString(),
                  transaction_amount: netBankingDetails?.amount,
                  payment_method: 'net_banking',
                  details: JSON.stringify(detail),
                  bank_reference: netBankingDetails?.utr || 'N/A',
                  reason: `Payment successfully collected via NetBanking (UTR: ${
                    netBankingDetails?.utr || 'N/A'
                  }) from ${
                    netBankingDetails?.payer?.bank_holder_name || 'payer'
                  }`,
                  payment_message: `Payment successfully collected via NetBanking (UTR: ${
                    netBankingDetails?.utr || 'N/A'
                  }) from ${
                    netBankingDetails?.payer?.bank_holder_name || 'payer'
                  }`,
                },
              },
              {
                upsert: true,
                new: true,
              },
            );

          const updateinstallments =
            await this.databaseService.InstallmentsModel.updateMany(
              {
                _id: { $in: InstallmentsIds },
                school_id,
                trustee_id,
              },
              {
                $set: {
                  status: 'paid',
                  payment_time: date
                    ? new Date(date).toISOString()
                    : new Date().toISOString(),
                },
              },
            );

          const callbackUrl = new URL(request.callbackUrl);
          callbackUrl.searchParams.set('status', 'SUCCESS');
          return res.json({ redirectUrl: callbackUrl.toString() });
        }
        if (mode === 'CHEQUE') {
          let collectIdObject = request._id;
          const detail = {
            cheque: {
              cheque_no: cheque_detail?.chequeNo,
              date_on_cheque: cheque_detail?.dateOnCheque,
              amount,
              remarks: cheque_detail?.remarks || remark || 'N/A',
              payer: {
                account_holder_name: cheque_detail?.accountHolderName || 'N/A',
                bank_name: cheque_detail?.bankName || 'N/A',
              },
            },
          };
          await this.databaseService.CollectRequestModel.updateOne(
            {
              _id: collectIdObject,
            },
            {
              $set: {
                gateway: Gateway.EDVIRON_PAY,
              },
            },
          );
          const updateReq =
            await this.databaseService.CollectRequestStatusModel.updateOne(
              {
                collect_id: collectIdObject,
              },
              {
                $set: {
                  status: 'SUCCESS',
                  payment_time: cheque_detail?.dateOnCheque
                    ? new Date(cheque_detail?.dateOnCheque).toISOString()
                    : new Date().toISOString(),
                  transaction_amount: amount,
                  payment_method: 'cheque',
                  details: JSON.stringify(detail),
                  bank_reference: 'N/A',
                  reason: `Payment successfully collected via cheque (cheque number: ${cheque_detail?.chequeNo}`,
                  payment_message: `Payment successfully collected via cheque (cheque number: ${cheque_detail?.chequeNo}`,
                },
              },
              {
                upsert: true,
                new: true,
              },
            );

          const updateinstallments =
            await this.databaseService.InstallmentsModel.updateMany(
              {
                _id: { $in: InstallmentsIds },
                school_id,
                trustee_id,
              },
              {
                $set: {
                  status: 'paid',
                  payment_time: cheque_detail?.dateOnCheque
                    ? new Date(cheque_detail?.dateOnCheque).toISOString()
                    : new Date().toISOString(),
                },
              },
            );

          const callbackUrl = new URL(request.callbackUrl);
          callbackUrl.searchParams.set('status', 'SUCCESS');
          return res.json({ redirectUrl: callbackUrl.toString() });
        }

        const response = await this.edvironPay.createOrder(
          request,
          school_name,
          gateway,
          PlatformCharge,
        );
        return res.send(response);
      }
    } catch (e) {
      console.log(e);
      if (e?.response) {
        throw new BadRequestException(e?.response?.message || 'network error');
      }
      throw new Error('Error occurred while processing payment: ' + e.message);
    }
  }

  @Post('update-cheque-status')
  async updateChequeStatus(
    @Query('collect_id') collect_id: string,
    @Query('status') status: string,
    @Query('token') token: string,
  ) {
    try {
      if (!collect_id || !status || !token) {
        throw new BadRequestException(
          'collect_id , token, and status are required',
        );
      }

      const collectIdObject = new Types.ObjectId(collect_id);
      const [request, collect_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);
      if (!request) {
        throw new BadRequestException('Collect request not found');
      }

      if (collect_status?.payment_method !== 'cheque') {
        throw new BadRequestException('payment is not paid through cheque');
      }
      const decrypt = _jwt.verify(token, process.env.KEY!) as any;
      if (decrypt.school_id.toString() !== request.school_id.toString()) {
        throw new BadRequestException('Request fordge');
      }

      if (!collect_status) {
        throw new BadRequestException('Collect request status not found');
      }
      await this.databaseService.CollectRequestStatusModel.updateOne(
        {
          collect_id: collectIdObject,
        },
        {
          $set: {
            status: status,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );
      const InstallmentsId = await this.databaseService.InstallmentsModel.find({
        collect_id: collectIdObject,
      }).select('_id');
      const newStatus =
        status === 'SUCCESS'
          ? EdvironPayPaymentStatus.SUCCESS
          : status === 'FAILED'
          ? EdvironPayPaymentStatus.UNPAID
          : EdvironPayPaymentStatus.UNPAID;

      await this.databaseService.InstallmentsModel.updateMany(
        { _id: { $in: InstallmentsId } },
        { $set: { status: newStatus } },
      );
      return {
        success: true,
        message: `Cheque status updated successfully to "${status}"`,
        updatedStatus: newStatus,
        collect_id: collect_id,
      };
    } catch (error) {
      throw new BadRequestException(
        error.response.message || 'Something went wrong while fetching data',
      );
    }
  }

  @Get('/student-installments')
  async getStudentInstallments(
    @Query('student_id') student_id: string,
    @Query('school_id') school_id: string,
    @Query('trustee_id') trustee_id: string,
  ) {
    try {
      let studentDetail = await this.edvironPay.studentFind(
        student_id,
        school_id,
        trustee_id,
      );
      console.log(studentDetail, 'studentDetail');

      const config = {
        method: 'get',
        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/get-trustee-school-logo?school_id=${school_id}&trustee_id=${trustee_id}`,
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
      };

      const { data } = await axios.request(config);
      if (!studentDetail) {
        throw new BadRequestException('student not found');
      }
      studentDetail = {
        ...studentDetail,
        ...data,
      };
      let installments = await this.databaseService.InstallmentsModel.find({
        student_id,
      })
        .sort({ year: 1, month: 1 }) // ensure sorted order (Jan → Dec)
        .lean();
      const firstUnpaidIndex = installments.findIndex(
        (i) => i.status == 'paid',
      );
      if (firstUnpaidIndex !== -1) {
        installments = installments.map((installment, index) => ({
          ...installment,
          preSelected: index === firstUnpaidIndex,
        }));
      } else {
        installments = installments.map((i) => ({ ...i, preSelected: false }));
      }

      installments.sort((a, b) => Number(a.month) - Number(b.month));

      return {
        installments,
        studentDetail,
      };
    } catch (e) {
      if (e.response?.data?.message) {
        throw new BadRequestException(e.response.data.message);
      }
      throw new BadRequestException(e.message);
    }
  }

  @Post('/callback/cashfree')
  async getInstallCallbackCashfree(@Query('collect_id') collect_id: string) {
    try {
      const request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!request) {
        throw new BadRequestException('Invalid Collect id in Callback');
      }
      request.gateway = Gateway.EDVIRON_PG;
    } catch (e) {}
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
      };

      const { data: vendors } = await axios.request(config);
      return vendors;
    } catch (e) {
      console.log(e);

      throw new BadRequestException(e.message);
    }
  }

  @Get('get-order-detail')
  async orderDetail(@Query('collect_id') collect_id: string): Promise<{
    paymentIds: PaymentIds;
    gateway: string;
  }> {
    try {
      const collect_request =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collect_request) {
        throw new BadRequestException('Order not found');
      }
      let activeGateway = 'none';
      let paymentIds = collect_request.paymentIds;
      if (paymentIds?.cashfree_id) {
        activeGateway = 'CASHFREE';
      } else if (paymentIds?.easebuzz_id) {
        activeGateway = 'EASEBUZZ';
      } else if (paymentIds?.easebuzz_upi_id) {
        activeGateway = 'EASEBUZZ_UPI';
      } else if (paymentIds?.easebuzz_cc_id) {
        activeGateway = 'EASEBUZZ_CC';
      } else if (paymentIds?.easebuzz_dc_id) {
        activeGateway = 'EASEBUZZ_DC';
      } else if (paymentIds?.ccavenue_id) {
        activeGateway = 'CCAVENUE';
      }
      return {
        paymentIds: collect_request.paymentIds,
        gateway: activeGateway,
      };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get('/get-erp-dqr')
  async getErpDqr(@Req() req: any) {
    try {
      const { collect_id, sign } = req.query;
      // verify sign
      const res = await this.edvironPay.erpDynamicQrRedirect(collect_id);
      return res;
    } catch (e) {
      console.log(e.response);

      if (e.response?.data?.message) {
        throw new BadRequestException(e.response.data.message);
      }
      throw new BadRequestException(e.message);
    }
  }

  @Get('/dqr/check-status')
  async checkDqrStatus(@Query('collect_id') collect_id: string) {
    try {
      const status = await this.edvironPay.checkStatusDQR(collect_id);
      return status;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('/get-fee-heads')
  async getFeeHeads(
    @Body()
    body: {
      startDate: string;
      endDate: string;
      school_id: string;
      trustee_id?: string;
      page: string;
      limit: string;
      isCustomSearch?: boolean;
      searchFilter?: string;
      searchParams?: string;
    },
  ) {
    const {
      startDate,
      endDate,
      trustee_id,
      school_id,
      page,
      limit,
      isCustomSearch,
      searchFilter,
      searchParams,
    } = body;
    try {
      const startOfDayUTC = new Date(
        await this.edvironPgService.convertISTStartToUTC(startDate),
      ); // Start of December 6 in IST
      const endOfDayUTC = new Date(
        await this.edvironPgService.convertISTEndToUTC(endDate),
      );
      if (!school_id) {
        throw new BadRequestException('School id required');
      }
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      // endOfDay.setHours(23, 59, 59, 999);
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const endOfDay = new Date(endDate);
      // Set hours, minutes, seconds, and milliseconds to the last moment of the day
      endOfDay.setHours(23, 59, 59, 999);
      let collectQuery: any = {
        // trustee_id: trustee_id,
        school_id: school_id,
        isCanteenTransaction: { $ne: true },
        createdAt: {
          $gte: startOfDayUTC,
          $lt: endOfDayUTC,
        },
      };

      if (startDate && endDate) {
        collectQuery = {
          ...collectQuery,
          createdAt: {
            $gte: startOfDayUTC,
            $lt: endOfDayUTC,
          },
        };
      }

      const installments =
        await this.databaseService.InstallmentsModel.aggregate([
          { $match: collectQuery },
          {
            $sort: { createdAt: -1 },
          },
          {
            $skip: (pageNum - 1) * limitNum,
          },
          { $limit: limitNum },
          {
            $project: {
              _id: 0,
              fee_heads: 1,
            },
          },
        ]);
      const tnxCount =
        await this.databaseService.InstallmentsModel.countDocuments(
          collectQuery,
        );
      const totalPages = Math.ceil(tnxCount / limitNum);
      return {
        totalCount: tnxCount,
        transactionReport: installments || [],
        current_page: pageNum,
        total_pages: totalPages,
      };
    } catch (error) {
      console.log(error);
    }
  }

  @Get('/get-student-detail')
  async getStudentDetail(
    @Query('school_id') school_id: string,
    @Query('trustee_id') trustee_id: string,
    @Query('student_id') student_id?: string,
    @Query('skip') skip = 0,
    @Query('limit') limit = 10,
  ) {
    try {
      const skipNum = Number(skip) || 0;
      const limitNum = Number(limit) || 10;
      const pipeline: any[] = [
        {
          $match: {
            school_id,
            trustee_id,
            ...(student_id && { student_id }),
          },
        },
        { $skip: skipNum },
        { $limit: limitNum },
      ];
      const studentDetail =
        await this.databaseService.StudentDetailModel.aggregate(pipeline);

      const totalCountPipeline = [
        {
          $match: {
            school_id,
            trustee_id,
            ...(student_id && { student_id }),
          },
        },
        { $count: 'total' },
      ];

      const totalResult =
        await this.databaseService.StudentDetailModel.aggregate(
          totalCountPipeline,
        );

      const totalCount = totalResult[0]?.total || 0;

      const total_pages = limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1;

      const current_page =
        limitNum > 0 ? Math.floor(skipNum / limitNum) + 1 : 1;

      return {
        success: true,
        totalCount,
        total_pages,
        current_page,
        skip: skipNum,
        limit: limitNum,
        data: studentDetail,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
