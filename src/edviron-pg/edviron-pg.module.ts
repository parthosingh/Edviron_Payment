import { Module, forwardRef } from '@nestjs/common';
import { EdvironPgController } from './edviron-pg.controller';
import { EdvironPgService } from './edviron-pg.service';
import { DatabaseModule } from '../database/database.module';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { NttdataService } from 'src/nttdata/nttdata.service';

@Module({
  controllers: [EdvironPgController],
  providers: [EdvironPgService, EasebuzzService, NttdataService],
  imports: [
    DatabaseModule,
    forwardRef(() => CashfreeModule), // Use forwardRef to avoid circular dependency
  ],
  exports: [EdvironPgService,CashfreeModule],
})
export class EdvironPgModule {}