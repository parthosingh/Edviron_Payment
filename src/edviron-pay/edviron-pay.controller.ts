import { Body, Controller, Post } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

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
console.log({isInstallement,installments});

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
          console.log({existing});
          
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
    }else{
        throw new Error('No installments found or isInstallement is false');
    }

    return { status: 'installment updated successfully for student_id: ' + student_id };
  }

}
