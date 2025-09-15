import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';

@Module({
  providers: [GatewayService,DatabaseService,EasebuzzService],
  imports:[DatabaseModule]
})
export class GatewayModule {}
