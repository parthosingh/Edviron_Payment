import { Test, TestingModule } from '@nestjs/testing';
import { PosPaytmController } from './pos-paytm.controller';

describe('PosPaytmController', () => {
  let controller: PosPaytmController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosPaytmController],
    }).compile();

    controller = module.get<PosPaytmController>(PosPaytmController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
