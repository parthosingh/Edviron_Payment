import { forwardRef, Module } from '@nestjs/common';
import { RazorpayController } from './razorpay.controller';
import { RazorpayService } from './razorpay.service';
import { DatabaseModule } from '../database/database.module';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { RazorpayNonseamlessService } from 'src/razorpay-nonseamless/razorpay-nonseamless.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => CashfreeModule)],
  controllers: [RazorpayController],
  providers: [RazorpayService, EdvironPgService, RazorpayNonseamlessService],
  exports: [RazorpayService],
})
export class RazorpayModule {}
