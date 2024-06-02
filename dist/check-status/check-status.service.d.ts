import { DatabaseService } from 'src/database/database.service';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
export declare class CheckStatusService {
    private readonly databaseService;
    private readonly hdfcService;
    private readonly phonePeService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, hdfcService: HdfcService, phonePeService: PhonepeService, edvironPgService: EdvironPgService);
    checkStatus(collect_request_id: String): Promise<{
        status: import("../types/transactionStatus").TransactionStatus;
        amount: number;
    }>;
    checkStatusByOrderId(order_id: String, trusteeId: string): Promise<{
        status: import("../types/transactionStatus").TransactionStatus;
        amount: number;
    }>;
}
