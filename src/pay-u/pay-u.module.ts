import { Module } from '@nestjs/common';
import { PayUService } from './pay-u.service';
import { PayUController } from './pay-u.controller';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { EdvironPgModule } from 'src/edviron-pg/edviron-pg.module';

@Module({
  providers: [PayUService,DatabaseService,EdvironPgService],
  imports:[DatabaseModule,EdvironPgModule],
  controllers: [PayUController] 
})
export class PayUModule {}