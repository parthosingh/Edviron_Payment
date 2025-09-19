import { Module, forwardRef } from '@nestjs/common';
import { EdvironPgController } from './edviron-pg.controller';
import { EdvironPgService } from './edviron-pg.service';
import { DatabaseModule } from '../database/database.module';

import { EasebuzzService } from '../easebuzz/easebuzz.service';
import { CashfreeModule } from '../cashfree/cashfree.module';
import { NttdataService } from '../nttdata/nttdata.service';
import { PosPaytmService } from '../pos-paytm/pos-paytm.service';
import { WorldlineService } from '../worldline/worldline.service';
import { RazorpayService } from '../razorpay/razorpay.service';

import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';


@Module({
  controllers: [EdvironPgController],
  providers: [
    EdvironPgService,
    EasebuzzService,
    NttdataService,
    WorldlineService,
    PosPaytmService,
    RazorpayService,
    RazorpayNonseamlessService
  ],
  imports: [
    DatabaseModule,
    forwardRef(() => CashfreeModule), // Use forwardRef to avoid circular dependency
  ],
  exports: [EdvironPgService, CashfreeModule],
})
export class EdvironPgModule {}
