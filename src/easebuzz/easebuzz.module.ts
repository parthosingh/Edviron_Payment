import { Module, forwardRef } from '@nestjs/common';
import { EasebuzzController } from './easebuzz.controller';
import { EasebuzzService } from './easebuzz.service';
import { DatabaseModule } from 'src/database/database.module';
import { CheckStatusModule } from 'src/check-status/check-status.module';

@Module({})
export class EasebuzzModule {}
