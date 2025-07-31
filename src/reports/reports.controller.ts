import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
constructor(
    private readonly databaseService: DatabaseService,
    private readonly cashfreeService: CashfreeService,
    private readonly edvironPgService: EdvironPgService,
    private readonly reportsService: ReportsService,
  ) {}

     @Post('/settlements-transactions')
      async getSettlementsTransactions(
        @Body() body: { limit: number; cursor: string | null },
        @Req() req: any,
      ) {
        const { utr, client_id, token, school_name } = req.query;
        try {
          const limit = body.limit || 40;
          console.log(limit, 'limit');
    
          return await this.reportsService.getTransactionForSettlements(
            utr,
            client_id,
            limit,
            school_name,
            body.cursor,
          );
        } catch (e) {
          // console.log(e)
          throw new BadRequestException(e.message);
        }
      }
}
