import { Test, TestingModule } from '@nestjs/testing';
import { EasebuzzService } from './easebuzz.service';

describe('EasebuzzService', () => {
  let service: EasebuzzService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EasebuzzService],
    }).compile();

    service = module.get<EasebuzzService>(EasebuzzService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
