import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { EdvironPgModule } from 'src/edviron-pg/edviron-pg.module';

@Module({
  providers: [ReportsService],
  imports: [DatabaseModule,CashfreeModule,EdvironPgModule],
  controllers: [ReportsController]
})
export class ReportsModule {}
