import { Test, TestingModule } from '@nestjs/testing';
import { CashfreeController } from './cashfree.controller';

describe('CashfreeController', () => {
  let controller: CashfreeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashfreeController],
    }).compile();

    controller = module.get<CashfreeController>(CashfreeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
