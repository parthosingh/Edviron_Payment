import { Test, TestingModule } from '@nestjs/testing';
import { WorldlineController } from './worldline.controller';

describe('WorldlineController', () => {
  let controller: WorldlineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorldlineController],
    }).compile();

    controller = module.get<WorldlineController>(WorldlineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
