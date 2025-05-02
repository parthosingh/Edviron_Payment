import { Module } from '@nestjs/common';
import { SmartgatewayController } from './smartgateway.controller';
import { SmartgatewayService } from './smartgateway.service';
import { DatabaseModule } from 'src/database/database.module';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SmartgatewayController],
  providers: [SmartgatewayService, EdvironPgService, CashfreeService],
})
export class SmartgatewayModule {}
