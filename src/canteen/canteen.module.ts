import { Module } from '@nestjs/common';
import { CanteenService } from './canteen.service';
import { CanteenController } from './canteen.controller';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { CheckStatusModule } from 'src/check-status/check-status.module';
import { EdvironPayModule } from 'src/edviron-pay/edviron-pay.module';
import { RazorpayService } from 'src/razorpay/razorpay.service';
import { CheckStatusService } from 'src/check-status/check-status.service';
import { EdvironPgModule } from 'src/edviron-pg/edviron-pg.module';
import { RazorpayModule } from 'src/razorpay/razorpay.module';

@Module({
  providers: [CanteenService],
  imports: [DatabaseModule,CashfreeModule,CheckStatusModule,EdvironPgModule,RazorpayModule],
  controllers: [CanteenController]
})
export class CanteenModule {}