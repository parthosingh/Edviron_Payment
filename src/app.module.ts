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

@Module({
  imports: [CollectModule, DatabaseModule, PhonepeModule, CheckStatusModule, HdfcModule, EdvironPgModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
