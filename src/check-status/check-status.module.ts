import { Module } from '@nestjs/common';
import { CheckStatusController } from './check-status.controller';
import { CheckStatusService } from './check-status.service';
import { DatabaseModule } from 'src/database/database.module';
import { PhonepeModule } from 'src/phonepe/phonepe.module';
import { HdfcModule } from 'src/hdfc/hdfc.module';
import { EdvironPgModule } from '../edviron-pg/edviron-pg.module';

@Module({
  controllers: [CheckStatusController],
  providers: [CheckStatusService],
  imports: [DatabaseModule, PhonepeModule, HdfcModule, EdvironPgModule],
})
export class CheckStatusModule {}
