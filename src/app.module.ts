import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollectModule } from './collect/collect.module';
import { PhonepeService } from './phonepe/phonepe.service';
import { DatabaseModule } from './database/database.module';
import { PhonepeModule } from './phonepe/phonepe.module';
import { CheckStatusModule } from './check-status/check-status.module';
import { HdfcModule } from './hdfc/hdfc.module';
import { EdvironPgModule } from './edviron-pg/edviron-pg.module';
import { CcavenueModule } from './ccavenue/ccavenue.module';
import { EasebuzzController } from './easebuzz/easebuzz.controller';
import { EasebuzzService } from './easebuzz/easebuzz.service';
import { CashfreeController } from './cashfree/cashfree.controller';
import { CashfreeModule } from './cashfree/cashfree.module';
import { SmartgatewayModule } from './smartgateway/smartgateway.module';
import { PayUModule } from './pay-u/pay-u.module';
import { HdfcRazorpayModule } from './hdfc_razporpay/hdfc_razorpay.module';
import { CashfreeService } from './cashfree/cashfree.service';
import { CcavenueService } from './ccavenue/ccavenue.service';
import { PosPaytmController } from './pos-paytm/pos-paytm.controller';
import { PosPaytmService } from './pos-paytm/pos-paytm.service';
import { NttdataModule } from './nttdata/nttdata.module';
import { WorldlineModule } from './worldline/worldline.module';
import { WorldlineController } from './worldline/worldline.controller';
import { WorldlineService } from './worldline/worldline.service';
import { RazorpayNonseamlessModule } from './razorpay-nonseamless/razorpay-nonseamless.module';
import { RazorpayNonseamlessController } from './razorpay-nonseamless/razorpay-nonseamless.controller';
import { RazorpayNonseamlessService } from './razorpay-nonseamless/razorpay-nonseamless.service';

@Module({
  imports: [
    CollectModule,
    DatabaseModule,
    PhonepeModule,
    CheckStatusModule,
    HdfcModule,
    EdvironPgModule,
    CcavenueModule,
    CashfreeModule,
    PayUModule,
    HdfcRazorpayModule,
    SmartgatewayModule,
    NttdataModule,
    RazorpayNonseamlessModule,
    WorldlineModule
  ],
  controllers: [AppController, EasebuzzController, CashfreeController, PosPaytmController, WorldlineController, RazorpayNonseamlessController],
  providers: [AppService, CashfreeService, EasebuzzService, CcavenueService, PosPaytmService, WorldlineService, RazorpayNonseamlessService],
})
export class AppModule {}
