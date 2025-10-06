import { Test, TestingModule } from '@nestjs/testing';
import { EdvironPayService } from './edviron-pay.service';

describe('EdvironPayService', () => {
  let service: EdvironPayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EdvironPayService],
    }).compile();

    service = module.get<EdvironPayService>(EdvironPayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
