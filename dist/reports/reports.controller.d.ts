import { CashfreeService } from 'src/cashfree/cashfree.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly databaseService;
    private readonly cashfreeService;
    private readonly edvironPgService;
    private readonly reportsService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService, edvironPgService: EdvironPgService, reportsService: ReportsService);
    getSettlementsTransactions(body: {
        limit: number;
        cursor: string | null;
    }, req: any): Promise<{
        cursor: any;
        limit: any;
        settlements_transactions: any[];
    }>;
}
