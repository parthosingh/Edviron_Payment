import { Test, TestingModule } from '@nestjs/testing';
import { EdvironSeamlessService } from './edviron-seamless.service';

describe('EdvironSeamlessService', () => {
  let service: EdvironSeamlessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EdvironSeamlessService],
    }).compile();

    service = module.get<EdvironSeamlessService>(EdvironSeamlessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
