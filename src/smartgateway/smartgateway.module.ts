import { Module } from '@nestjs/common';
import { SmartgatewayController } from './smartgateway.controller';
import { SmartgatewayService } from './smartgateway.service';
import { DatabaseModule } from 'src/database/database.module';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { CheckStatusService } from 'src/check-status/check-status.service';
import { CheckStatusModule } from 'src/check-status/check-status.module';
import { HdfcRazorpayModule } from 'src/hdfc_razporpay/hdfc_razorpay.module';
import { RazorpayService } from 'src/razorpay/razorpay.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SmartgatewayController],
  providers: [
    SmartgatewayService,
    EdvironPgService,
    CashfreeService,
    RazorpayService
    // CheckStatusService,
  ],
})
export class SmartgatewayModule {}
