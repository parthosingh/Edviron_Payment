import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayNonseamlessService } from './razorpay-nonseamless.service';

describe('RazorpayNonseamlessService', () => {
  let service: RazorpayNonseamlessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RazorpayNonseamlessService],
    }).compile();

    service = module.get<RazorpayNonseamlessService>(
      RazorpayNonseamlessService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
