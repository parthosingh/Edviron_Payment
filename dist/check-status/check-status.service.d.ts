import { DatabaseService } from 'src/database/database.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
export declare class CheckStatusService {
    private readonly databaseService;
    private readonly phonePeService;
    constructor(databaseService: DatabaseService, phonePeService: PhonepeService);
    checkStatus(transactionId: String): Promise<{
        status: import("../types/transactionStatus").TransactionStatus;
        amount: number;
    }>;
}
