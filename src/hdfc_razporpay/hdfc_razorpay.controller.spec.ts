import { Test, TestingModule } from '@nestjs/testing';
import { HdfcRazorpayController } from './hdfc_razorpay.controller';

describe('HdfcRazporpayController', () => {
  let controller: HdfcRazorpayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HdfcRazorpayController],
    }).compile();

    controller = module.get<HdfcRazorpayController>(HdfcRazorpayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
