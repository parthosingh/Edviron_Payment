import { Test, TestingModule } from '@nestjs/testing';
import { EdvironPgService } from './edviron-pg.service';

describe('EdvironPgService', () => {
  let service: EdvironPgService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EdvironPgService],
    }).compile();

    service = module.get<EdvironPgService>(EdvironPgService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
