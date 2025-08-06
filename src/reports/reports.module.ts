import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { EdvironPgModule } from 'src/edviron-pg/edviron-pg.module';
import { AwsS3ServiceService } from 'src/aws-s3-service/aws-s3-service.service';

@Module({
  providers: [ReportsService,AwsS3ServiceService],
  imports: [DatabaseModule,CashfreeModule,EdvironPgModule],
  controllers: [ReportsController]
})
export class ReportsModule {}
