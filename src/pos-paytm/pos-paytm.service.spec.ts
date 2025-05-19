import { Test, TestingModule } from '@nestjs/testing';
import { PosPaytmService } from './pos-paytm.service';

describe('PosPaytmService', () => {
  let service: PosPaytmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PosPaytmService],
    }).compile();

    service = module.get<PosPaytmService>(PosPaytmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
