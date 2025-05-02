import { Test, TestingModule } from '@nestjs/testing';
import { SmartgatewayController } from './smartgateway.controller';

describe('SmartgatewayController', () => {
  let controller: SmartgatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmartgatewayController],
    }).compile();

    controller = module.get<SmartgatewayController>(SmartgatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
