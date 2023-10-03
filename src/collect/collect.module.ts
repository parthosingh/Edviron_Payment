import { Module } from '@nestjs/common';
import { CollectController } from './collect.controller';
import { CollectService } from './collect.service';
import { PhonepeModule } from 'src/phonepe/phonepe.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [CollectController],
  providers: [CollectService],
  imports: [PhonepeModule, DatabaseModule],
})
export class CollectModule {}
