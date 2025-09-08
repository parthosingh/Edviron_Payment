import { Module, forwardRef } from '@nestjs/common';
import { CashfreeService } from './cashfree.service';
import { DatabaseModule } from 'src/database/database.module';
import { CashfreeController } from './cashfree.controller';
import { EdvironPgModule } from 'src/edviron-pg/edviron-pg.module';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';

@Module({
  providers: [CashfreeService, EasebuzzService],
  imports: [
    DatabaseModule,
    forwardRef(() => EdvironPgModule), // Use forwardRef to avoid circular dependency
  ],
  exports: [CashfreeService],
  controllers: [CashfreeController],
})
export class CashfreeModule {}
