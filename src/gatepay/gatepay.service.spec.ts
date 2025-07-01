import { Test, TestingModule } from '@nestjs/testing';
import { GatepayService } from './gatepay.service';

describe('GatepayService', () => {
  let service: GatepayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GatepayService],
    }).compile();

    service = module.get<GatepayService>(GatepayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
