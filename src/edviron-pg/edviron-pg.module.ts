import { Module } from '@nestjs/common';
import { EdvironPgController } from './edviron-pg.controller';
import { EdvironPgService } from './edviron-pg.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  controllers: [EdvironPgController],
  providers: [EdvironPgService],
  imports: [DatabaseModule],
  exports: [EdvironPgService],
})
export class EdvironPgModule {}
