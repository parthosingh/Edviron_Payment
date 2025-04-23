import { Module } from '@nestjs/common';
import { CollectController } from './collect.controller';
import { CollectService } from './collect.service';
import { PhonepeModule } from 'src/phonepe/phonepe.module';
import { DatabaseModule } from 'src/database/database.module';
import { HdfcModule } from 'src/hdfc/hdfc.module';
import { EdvironPgModule } from '../edviron-pg/edviron-pg.module';
import { CcavenueModule } from 'src/ccavenue/ccavenue.module';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
import { HdfcRazorpayService } from 'src/hdfc_razporpay/hdfc_razorpay.service';

@Module({
  controllers: [CollectController],
  providers: [CollectService,CcavenueService, HdfcRazorpayService],
  imports: [PhonepeModule, DatabaseModule, HdfcModule, EdvironPgModule,CcavenueModule],
})
export class CollectModule {}
