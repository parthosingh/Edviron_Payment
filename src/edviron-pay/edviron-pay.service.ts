import { BadRequestException, Injectable, Query } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  CollectRequest,
  PaymentIds,
} from 'src/database/schemas/collect_request.schema';
import * as axios from 'axios';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
@Injectable()
export class EdvironPayService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cashfreeService: CashfreeService,
    private readonly easebuzzService: EasebuzzService,
    private readonly edvironPgService: EdvironPgService,
  ) {}

  async vpaOrder(request: CollectRequest) {
    try {
      return this.cashfreeService.createPayoutCashfree(request);
    } catch (error) {
      console.log(error, 'lund');
    }
  }

  async createOrder(
    request: CollectRequest,
    school_name: string,
    gatewat: {
      cashfree: boolean;
      easebuzz: boolean;
      razorpay: boolean;
    },
    platform_charges: any,
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
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(request._id);
      if (!collectReq) {
        throw new BadRequestException('Collect Request not found');
      }
      if (gatewat.cashfree) {
        const cashfreeSessionId =
          await this.cashfreeService.createOrderCashfree(
            request,
            request.isSplitPayments,
            request.cashfreeVedors,
          );
        console.log(cashfreeSessionId);

        paymentInfo.cashfree_id = cashfreeSessionId;
        await collectReq.save();
      }

      let easebuzz_pg = false;

      if (gatewat.easebuzz) {
        easebuzz_pg = true;
        let easebuzzSessionId;
        if (request.isSplitPayments) {
          easebuzzSessionId =
            await this.easebuzzService.createOrderSeamlessSplit(request);
        } else {
          easebuzzSessionId =
            await this.easebuzzService.createOrderSeamlessNonSplit(request);
        }
        paymentInfo.easebuzz_id = easebuzzSessionId;
        await collectReq.save();
      }
      const disabled_modes_string = request.disabled_modes
        .map((mode) => `${mode}=false`)
        .join('&');
      const encodedPlatformCharges = encodeURIComponent(
        JSON.stringify(platform_charges),
      );
      collectReq.paymentIds = paymentInfo;
      await collectReq.save();
      console.log(paymentInfo, 'sdfjdslakfjasld');
      return {
        collect_request_id: request._id,
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
      
      if (err?.response) {
        throw new BadRequestException(
          err?.response?.message || 'cashfree error',
        );
      }
      throw new BadRequestException(err.message);
    }
  }

  // async handelCashfreecallback(collectRequest: CollectRequest) {
  //     try {
  //         const collect_request_id = collectRequest._id.toString()
  //         let status: any;
  //         if (
  //             collectRequest.cashfree_non_partner &&
  //             collectRequest.cashfree_credentials
  //         ) {
  //             const status2 =
  //                 await this.cashfreeService.checkStatusV2(collect_request_id);
  //             status = status2.status;
  //         } else {
  //             const status1 = await this.edvironPgService.checkStatus(
  //                 collect_request_id,
  //                 collectRequest,
  //             );
  //             status = status1.status;
  //         }

  //          if (collectRequest?.sdkPayment) {
  //     if (status === `SUCCESS`) {
  //       const callbackUrl = new URL(collectRequest?.callbackUrl);
  //       callbackUrl.searchParams.set('status', 'SUCCESS');
  //       callbackUrl.searchParams.set(
  //         'EdvironCollectRequestId',
  //         collect_request_id,
  //       );
  //       return res.redirect(
  //         `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_request_id}`,
  //       );
  //     }
  //     console.log(`SDK payment failed for ${collect_request_id}`);

  //     res.redirect(
  //       `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_request_id}`,
  //     );
  //   }

  //     } catch (e) {
  //         throw new BadRequestException(e.message)
  //     }
  // }

  async createStudent(
    student_detail: {
      student_id: string;
      student_name: string;
      student_email: string;
      student_number: string;
      student_class?: string;
      section?: string;
      gender?: string;
      additional_info?: string;
    },
    school_id: string,
    trustee_id: string,
  ) {
    const {
      student_id,
      student_number,
      student_name,
      student_email,
      section,
      gender,
      additional_info,
      student_class,
    } = student_detail;
    try {
      const studentDetail =
        await this.databaseService.StudentDetailModel.findOne({
          student_id: student_id,
          school_id: school_id,
          trustee_id: trustee_id,
        });
      if (!studentDetail) {
        await this.databaseService.StudentDetailModel.create({
          student_id,
          student_email,
          student_name,
          trustee_id,
          school_id,
          student_class,
          section,
          gender,
          additional_info,
        });
      }
      return studentDetail;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async studentFind(student_id: string, school_id: string, trustee_id: string) {
    try {
      const studentDetail =
        await this.databaseService.StudentDetailModel.findOne({
          student_id: student_id,
          school_id: school_id,
          trustee_id: trustee_id,
        });
      if (!studentDetail) {
        throw new BadRequestException('student not found');
      }
      return studentDetail;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async nonEdvironInstallments(collect_id: string) {
    try {
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(collect_id);
      if (!collectReq) throw new Error('Collect request not found');
      let collectIdObject = collectReq._id;
      const collectReqStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: collectIdObject,
        });

      if (!collectReqStatus) throw new Error('Collect request not found');
      if (collectReq?.isCollectNow) {
        let status = collectReqStatus.status === 'SUCCESS' ? 'paid' : 'unpaid';

        const installments = await this.databaseService.InstallmentsModel.find({
          collect_id: collectIdObject,
        });

        for (let installment of installments) {
          await this.databaseService.InstallmentsModel.findOneAndUpdate(
            { _id: installment._id },
            { $set: { status: status } },
            { new: true },
          );
        }
        return 'installments update successfull';
      }
      return 'no installment found for this collect id';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
