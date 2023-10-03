import { Module } from '@nestjs/common';
import { CheckStatusController } from './check-status.controller';
import { CheckStatusService } from './check-status.service';
import { DatabaseModule } from 'src/database/database.module';
import { PhonepeModule } from 'src/phonepe/phonepe.module';

@Module({
  controllers: [CheckStatusController],
  providers: [CheckStatusService],
  imports: [DatabaseModule, PhonepeModule],
})
export class CheckStatusModule {}
