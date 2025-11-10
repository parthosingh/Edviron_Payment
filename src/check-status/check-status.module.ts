import { forwardRef, Module } from '@nestjs/common';
import { CheckStatusController } from './check-status.controller';
import { CheckStatusService } from './check-status.service';
import { DatabaseModule } from 'src/database/database.module';
import { PhonepeModule } from 'src/phonepe/phonepe.module';
import { HdfcModule } from 'src/hdfc/hdfc.module';
import { EdvironPgModule } from '../edviron-pg/edviron-pg.module';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { PayUService } from 'src/pay-u/pay-u.service';
import { HdfcRazorpayService } from 'src/hdfc_razporpay/hdfc_razorpay.service';
import { SmartgatewayService } from 'src/smartgateway/smartgateway.service';
import { NttdataService } from 'src/nttdata/nttdata.service';
import { PosPaytmService } from 'src/pos-paytm/pos-paytm.service';
import { WorldlineService } from 'src/worldline/worldline.service';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';
import { GatepayService } from 'src/gatepay/gatepay.service';
import { RazorpayService } from 'src/razorpay/razorpay.service';
import { EasebuzzModule } from 'src/easebuzz/easebuzz.module';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';

@Module({
  controllers: [CheckStatusController],
  providers: [
    CheckStatusService,
    CcavenueService,
    SmartgatewayService,
    PayUService,
    HdfcRazorpayService,
    NttdataService,
    PosPaytmService,
    WorldlineService,
    RazorpayNonseamlessService,
    GatepayService,
    RazorpayService,
    EasebuzzService
  ],
  imports: [
    DatabaseModule,
    PhonepeModule,
    CashfreeModule,
    HdfcModule,
    EdvironPgModule,
  forwardRef(() => EasebuzzModule), // use forwardRef both ways
  ],
  exports: [CheckStatusService],
})
export class CheckStatusModule {}
