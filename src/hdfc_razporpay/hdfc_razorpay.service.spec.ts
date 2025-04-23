import { Test, TestingModule } from '@nestjs/testing';
import { HdfcRazorpayService } from './hdfc_razorpay.service';

describe('HdfcRazporpayService', () => {
  let service: HdfcRazorpayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HdfcRazorpayService],
    }).compile();

    service = module.get<HdfcRazorpayService>(HdfcRazorpayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
