import { Module } from '@nestjs/common';
import { PayUService } from './pay-u.service';
import { PayUController } from './pay-u.controller';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  providers: [PayUService,DatabaseService],
  imports:[DatabaseModule],
  controllers: [PayUController] 
})
export class PayUModule {}