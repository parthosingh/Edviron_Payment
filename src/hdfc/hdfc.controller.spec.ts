import { Test, TestingModule } from '@nestjs/testing';
import { HdfcController } from './hdfc.controller';

describe('HdfcController', () => {
  let controller: HdfcController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HdfcController],
    }).compile();

    controller = module.get<HdfcController>(HdfcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
