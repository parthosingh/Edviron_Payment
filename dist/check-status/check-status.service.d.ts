import { DatabaseService } from 'src/database/database.service';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
export declare class CheckStatusService {
    private readonly databaseService;
    private readonly hdfcService;
    private readonly phonePeService;
    constructor(databaseService: DatabaseService, hdfcService: HdfcService, phonePeService: PhonepeService);
    checkStatus(transactionId: String): Promise<{
        status: import("../types/transactionStatus").TransactionStatus;
        amount: number;
    } | undefined>;
}
