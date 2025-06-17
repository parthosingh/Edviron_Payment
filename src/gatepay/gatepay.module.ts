import { Module } from '@nestjs/common';
import { GatepayController } from './gatepay.controller';
import { GatepayService } from './gatepay.service';

@Module({
  controllers: [GatepayController],
  providers: [GatepayService]
})
export class GatepayModule {}
