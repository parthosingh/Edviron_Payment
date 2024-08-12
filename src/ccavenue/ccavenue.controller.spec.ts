import { Test, TestingModule } from '@nestjs/testing';
import { CcavenueController } from './ccavenue.controller';

describe('CcavenueController', () => {
  let controller: CcavenueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CcavenueController],
    }).compile();

    controller = module.get<CcavenueController>(CcavenueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
