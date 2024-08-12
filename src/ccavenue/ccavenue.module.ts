import { Module } from '@nestjs/common';
import { CcavenueController } from './ccavenue.controller';
import { CcavenueService } from './ccavenue.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
    controllers:[CcavenueController],
    providers:[CcavenueService],
    imports:[DatabaseModule]
})
export class CcavenueModule {}
