import { Module } from '@nestjs/common';
import { HdfcRazorpayController } from './hdfc_razorpay.controller';
import { HdfcRazorpayService } from './hdfc_razorpay.service';
import { DatabaseModule } from '../database/database.module';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { DatabaseService } from 'src/database/database.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';

@Module({
  controllers: [HdfcRazorpayController],
  providers: [
    HdfcRazorpayService,
    EdvironPgService,
    DatabaseService,
    CashfreeService,
  ],
  imports: [DatabaseModule],
})
export class HdfcRazorpayModule {}
