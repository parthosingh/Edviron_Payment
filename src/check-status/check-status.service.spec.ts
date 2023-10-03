import { Test, TestingModule } from '@nestjs/testing';
import { CheckStatusService } from './check-status.service';

describe('CheckStatusService', () => {
  let service: CheckStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckStatusService],
    }).compile();

    service = module.get<CheckStatusService>(CheckStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
