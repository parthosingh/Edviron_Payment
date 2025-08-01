import { CashfreeService } from 'src/cashfree/cashfree.service';
import { DatabaseService } from 'src/database/database.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
import { AwsS3ServiceService } from 'src/aws-s3-service/aws-s3-service.service';
export declare class ReportsService {
    private readonly databaseService;
    private readonly cashfreeService;
    private readonly edvironPgService;
    private readonly awsS3Service;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService, edvironPgService: EdvironPgService, awsS3Service: AwsS3ServiceService);
    getTransactionForSettlements(utr: string, client_id: string, limit: number, school_name: string, cursor: string | null, school_id?: string | null): Promise<{
        cursor: any;
        limit: any;
        settlements_transactions: any;
    }>;
    getBulkReport(utrs: [
        {
            utr: string;
            client_id: string;
            school_name: string;
        }
    ], report_id: string): Promise<{
        report_url: string;
        total_transactions: number;
    }>;
}
