import { Test, TestingModule } from '@nestjs/testing';
import { CcavenueService } from './ccavenue.service';

describe('CcavenueService', () => {
  let service: CcavenueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CcavenueService],
    }).compile();

    service = module.get<CcavenueService>(CcavenueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
