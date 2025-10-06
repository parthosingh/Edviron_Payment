import { Test, TestingModule } from '@nestjs/testing';
import { EdvironSeamlessController } from './edviron-seamless.controller';

describe('EdvironSeamlessController', () => {
  let controller: EdvironSeamlessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EdvironSeamlessController],
    }).compile();

    controller = module.get<EdvironSeamlessController>(EdvironSeamlessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
