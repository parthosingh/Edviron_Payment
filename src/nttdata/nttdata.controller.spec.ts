import { Test, TestingModule } from '@nestjs/testing';
import { NttdataController } from './nttdata.controller';

describe('NttdataController', () => {
  let controller: NttdataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NttdataController],
    }).compile();

    controller = module.get<NttdataController>(NttdataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
