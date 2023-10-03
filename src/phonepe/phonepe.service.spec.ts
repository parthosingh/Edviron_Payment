import { Test, TestingModule } from '@nestjs/testing';
import { PhonepeService } from './phonepe.service';

describe('PhonepeService', () => {
  let service: PhonepeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhonepeService],
    }).compile();

    service = module.get<PhonepeService>(PhonepeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
