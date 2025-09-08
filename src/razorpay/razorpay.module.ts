import { forwardRef, Module } from '@nestjs/common';
import { RazorpayController } from './razorpay.controller';
import { RazorpayService } from './razorpay.service';
import { DatabaseModule } from '../database/database.module';
import { CashfreeModule } from 'src/cashfree/cashfree.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => CashfreeModule)],
  controllers: [RazorpayController],
  providers: [RazorpayService],
})
export class RazorpayModule {}
