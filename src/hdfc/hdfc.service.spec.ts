import { Test, TestingModule } from '@nestjs/testing';
import { HdfcService } from './hdfc.service';

describe('HdfcService', () => {
  let service: HdfcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HdfcService],
    }).compile();

    service = module.get<HdfcService>(HdfcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
