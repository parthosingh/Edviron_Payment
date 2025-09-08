import { Module } from '@nestjs/common';
import { NttdataController } from './nttdata.controller';
import { NttdataService } from './nttdata.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [NttdataController],
  providers: [NttdataService],
  imports: [DatabaseModule],
})
export class NttdataModule {}
