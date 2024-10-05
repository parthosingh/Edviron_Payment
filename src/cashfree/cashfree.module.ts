import { Module } from '@nestjs/common';
import { CashfreeService } from './cashfree.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  providers: [CashfreeService],
  imports:[DatabaseModule]

})
export class CashfreeModule {}
