import { Test, TestingModule } from '@nestjs/testing';
import { SmartgatewayService } from './smartgateway.service';

describe('SmartgatewayService', () => {
  let service: SmartgatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartgatewayService],
    }).compile();

    service = module.get<SmartgatewayService>(SmartgatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
