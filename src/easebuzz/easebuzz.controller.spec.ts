import { Test, TestingModule } from '@nestjs/testing';
import { EasebuzzController } from './easebuzz.controller';

describe('EasebuzzController', () => {
  let controller: EasebuzzController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EasebuzzController],
    }).compile();

    controller = module.get<EasebuzzController>(EasebuzzController);
  });
  //changes

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
