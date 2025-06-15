import { Module, forwardRef } from '@nestjs/common';
import { CashfreeModule } from 'src/cashfree/cashfree.module';
import { DatabaseModule } from 'src/database/database.module';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';

@Module({
    imports: [
        DatabaseModule,
        forwardRef(() => CashfreeModule), 
    ],
    controllers: [],
    providers: [EdvironPgService],
    exports: [],
})
export class RazorpayNonseamlessModule { }
