import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { WorldlineService } from './worldline.service';
import { WorldlineController } from './worldline.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [WorldlineController],
  providers: [WorldlineService],
})
export class WorldlineModule {}
