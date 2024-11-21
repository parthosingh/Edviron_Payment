import { Module, forwardRef } from '@nestjs/common';
import { CashfreeService } from './cashfree.service';
import { DatabaseModule } from 'src/database/database.module';
import { CashfreeController } from './cashfree.controller';
import { EdvironPgModule } from 'src/edviron-pg/edviron-pg.module';

@Module({
  providers: [CashfreeService],
  imports: [
    DatabaseModule,
    forwardRef(() => EdvironPgModule), // Use forwardRef to avoid circular dependency
  ],
  exports: [CashfreeService],
  controllers: [CashfreeController],
})
export class CashfreeModule {}