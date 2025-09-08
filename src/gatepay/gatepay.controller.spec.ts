import { Test, TestingModule } from '@nestjs/testing';
import { GatepayController } from './gatepay.controller';

describe('GatepayController', () => {
  let controller: GatepayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatepayController],
    }).compile();

    controller = module.get<GatepayController>(GatepayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
