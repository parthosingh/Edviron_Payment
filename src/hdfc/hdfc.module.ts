import { Module } from '@nestjs/common';
import { HdfcService } from './hdfc.service';
import { DatabaseModule } from 'src/database/database.module';
import { HdfcController } from './hdfc.controller';

@Module({
  imports: [DatabaseModule],
  exports: [HdfcService],
  providers: [HdfcService],
  controllers: [HdfcController],
})
export class HdfcModule {}
