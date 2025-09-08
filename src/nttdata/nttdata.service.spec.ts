import { Test, TestingModule } from '@nestjs/testing';
import { NttdataService } from './nttdata.service';

describe('NttdataService', () => {
  let service: NttdataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NttdataService],
    }).compile();

    service = module.get<NttdataService>(NttdataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
