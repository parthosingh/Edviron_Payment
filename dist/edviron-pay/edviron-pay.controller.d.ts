import { DatabaseService } from 'src/database/database.service';
export declare class EdvironPayController {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    upsertInstallments(body: any): Promise<{
        status: string;
    }>;
}
