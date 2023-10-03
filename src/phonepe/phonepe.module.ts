import { Module } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PhonepeService } from './phonepe.service';
import { DatabaseModule } from 'src/database/database.module';
import { PhonepeController } from './phonepe.controller';

@Module({
    imports: [DatabaseModule],
    exports: [PhonepeService],
    providers: [PhonepeService],
    controllers: [PhonepeController]
})
export class PhonepeModule {
    
}
