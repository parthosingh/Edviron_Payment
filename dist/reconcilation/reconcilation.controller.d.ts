import { DatabaseService } from 'src/database/database.service';
export declare class ReconcilationController {
    private databaseService;
    constructor(databaseService: DatabaseService);
    easebuzzRecon(body: {
        sign: string;
        utr: string;
        collect_ids: string[];
    }): Promise<any[]>;
}
