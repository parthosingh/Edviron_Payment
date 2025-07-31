import { CashfreeService } from 'src/cashfree/cashfree.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class ReportsService {
    private readonly databaseService;
    private readonly cashfreeService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService, edvironPgService: EdvironPgService);
    getTransactionForSettlements(utr: string, client_id: string, limit: number, school_name: string, cursor: string | null): Promise<{
        cursor: any;
        limit: any;
        settlements_transactions: any[];
    }>;
}
