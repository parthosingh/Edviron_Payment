import { Test, TestingModule } from '@nestjs/testing';
import { WorldlineService } from './worldline.service';

describe('WorldlineService', () => {
  let service: WorldlineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorldlineService],
    }).compile();

    service = module.get<WorldlineService>(WorldlineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
