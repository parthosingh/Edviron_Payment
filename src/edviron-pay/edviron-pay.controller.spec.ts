import { Test, TestingModule } from '@nestjs/testing';
import { EdvironPayController } from './edviron-pay.controller';

describe('EdvironPayController', () => {
  let controller: EdvironPayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EdvironPayController],
    }).compile();

    controller = module.get<EdvironPayController>(EdvironPayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
