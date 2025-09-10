import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  providers: [GatewayService,DatabaseService],
  imports:[DatabaseModule]
})
export class GatewayModule {}
