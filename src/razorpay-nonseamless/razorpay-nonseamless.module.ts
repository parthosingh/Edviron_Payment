import { Module, forwardRef } from '@nestjs/common';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { DatabaseModule } from 'src/database/database.module';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { RazorpayService } from 'src/razorpay/razorpay.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => CashfreeModule)],
  controllers: [],
  providers: [EdvironPgService, RazorpayService],
  exports: [],
})
export class RazorpayNonseamlessModule {}
