import { Test, TestingModule } from '@nestjs/testing';
import { AwsS3ServiceService } from './aws-s3-service.service';

describe('AwsS3ServiceService', () => {
  let service: AwsS3ServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsS3ServiceService],
    }).compile();

    service = module.get<AwsS3ServiceService>(AwsS3ServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
