import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
} from '@nestjs/common';
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
    @Body()
    body: {
      utrs: [
        {
          utr: string;
          client_id: string;
          school_name: string;
        },
      ];
      report_id: string;
    },
    @Req() req: any,
  ) {
    try {
      console.log('test');

      const limit = 1000;
      console.log(limit, 'limit');
      setImmediate(async () => {
        try {
          console.log('test01');

          await this.reportsService.getBulkReport(body.utrs, body.report_id);
        } catch (e) {}
      });

      // return this.reportsService.getBulkReport(body.utrs, body.report_id);
      return { msg: 'Report generation started' };
    } catch (e) {
      // console.log(e)
      throw new BadRequestException(e.message);
    }
  }
}
