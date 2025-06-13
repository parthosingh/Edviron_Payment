import { Module } from '@nestjs/common';
import { CcavenueModule } from 'src/ccavenue/ccavenue.module';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { HdfcRazorpayService } from 'src/hdfc_razporpay/hdfc_razorpay.service';
import { PayUService } from 'src/pay-u/pay-u.service';
import { DatabaseModule } from 'src/database/database.module';
import { HdfcModule } from 'src/hdfc/hdfc.module';
import { PhonepeModule } from 'src/phonepe/phonepe.module';
import { SmartgatewayService } from 'src/smartgateway/smartgateway.service';
import { EdvironPgModule } from '../edviron-pg/edviron-pg.module';
import { CollectController } from './collect.controller';
import { CollectService } from './collect.service';
import { NttdataService } from 'src/nttdata/nttdata.service';
import { PosPaytmService } from 'src/pos-paytm/pos-paytm.service';
import { WorldlineService } from 'src/worldline/worldline.service';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';




@Module({
  controllers: [CollectController],
  providers: [CollectService, CcavenueService, HdfcRazorpayService,PayUService, SmartgatewayService, NttdataService, RazorpayNonseamlessService, PosPaytmService, WorldlineService],
  imports: [
    PhonepeModule,
    DatabaseModule,
    HdfcModule,
    EdvironPgModule,
    CcavenueModule,
  ],
})
export class CollectModule {}
