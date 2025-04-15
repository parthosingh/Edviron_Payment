import { Test, TestingModule } from '@nestjs/testing';
import { PayUService } from './pay-u.service';

describe('PayUService', () => {
  let service: PayUService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayUService],
    }).compile();

    service = module.get<PayUService>(PayUService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
