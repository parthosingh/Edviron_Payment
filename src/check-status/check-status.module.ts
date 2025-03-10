import { Module } from '@nestjs/common';
import { CheckStatusController } from './check-status.controller';
import { CheckStatusService } from './check-status.service';
import { DatabaseModule } from 'src/database/database.module';
import { PhonepeModule } from 'src/phonepe/phonepe.module';
import { HdfcModule } from 'src/hdfc/hdfc.module';
import { EdvironPgModule } from '../edviron-pg/edviron-pg.module';
import { CcavenueModule } from 'src/ccavenue/ccavenue.module';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { CashfreeModule } from 'src/cashfree/cashfree.module';

@Module({
  controllers: [CheckStatusController],
  providers: [CheckStatusService,CcavenueService,EasebuzzService],
  imports: [DatabaseModule, PhonepeModule,CashfreeModule, HdfcModule, EdvironPgModule],
})
export class CheckStatusModule {}
