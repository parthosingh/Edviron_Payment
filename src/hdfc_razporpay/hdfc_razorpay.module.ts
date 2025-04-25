import { Module } from '@nestjs/common';
import { HdfcRazorpayController } from './hdfc_razorpay.controller';
import { HdfcRazorpayService } from './hdfc_razorpay.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  controllers: [HdfcRazorpayController],
  providers: [HdfcRazorpayService],
  imports: [DatabaseModule],
})
export class HdfcRazorpayModule {}
