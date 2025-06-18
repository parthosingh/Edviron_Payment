import { Module } from '@nestjs/common';
import { GatepayController } from './gatepay.controller';
import { GatepayService } from './gatepay.service';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [GatepayController],
  providers: [GatepayService, DatabaseService],
  imports:[DatabaseModule]
})
export class GatepayModule {}
