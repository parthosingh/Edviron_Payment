import { Test, TestingModule } from '@nestjs/testing';
import { PayUController } from './pay-u.controller';

describe('PayUController', () => {
  let controller: PayUController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayUController],
    }).compile();

    controller = module.get<PayUController>(PayUController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
