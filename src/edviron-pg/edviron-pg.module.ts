import { Module, forwardRef } from '@nestjs/common';
import { EdvironPgController } from './edviron-pg.controller';
import { EdvironPgService } from './edviron-pg.service';
import { DatabaseModule } from '../database/database.module';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { NttdataService } from 'src/nttdata/nttdata.service';
import { PosPaytmService } from 'src/pos-paytm/pos-paytm.service';

@Module({
  controllers: [EdvironPgController],
  providers: [EdvironPgService, EasebuzzService, NttdataService, PosPaytmService],
  imports: [
    DatabaseModule,
    forwardRef(() => CashfreeModule), // Use forwardRef to avoid circular dependency
  ],
  exports: [EdvironPgService,CashfreeModule],
})
export class EdvironPgModule {}