import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayNonseamlessController } from './razorpay-nonseamless.controller';

describe('RazorpayNonseamlessController', () => {
  let controller: RazorpayNonseamlessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RazorpayNonseamlessController],
    }).compile();

    controller = module.get<RazorpayNonseamlessController>(RazorpayNonseamlessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
