import { Module } from '@nestjs/common';
import { EdvironPgController } from './edviron-pg.controller';
import { EdvironPgService } from './edviron-pg.service';
import { DatabaseModule } from '../database/database.module';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';

@Module({
  controllers: [EdvironPgController],
  providers: [EdvironPgService,EasebuzzService],
  imports: [DatabaseModule],
  exports: [EdvironPgService],
})
export class EdvironPgModule {}
