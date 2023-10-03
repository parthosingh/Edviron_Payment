import { Test, TestingModule } from '@nestjs/testing';
import { CheckStatusController } from './check-status.controller';

describe('CheckStatusController', () => {
  let controller: CheckStatusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckStatusController],
    }).compile();

    controller = module.get<CheckStatusController>(CheckStatusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
