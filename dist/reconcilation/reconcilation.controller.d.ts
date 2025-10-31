import { DatabaseService } from 'src/database/database.service';
export declare class ReconcilationController {
    private databaseService;
    constructor(databaseService: DatabaseService);
    easebuzzRecon(body: {
        sign: string;
        collect_ids: string[];
        utr: string;
        school_name: string;
    }): Promise<any[]>;
}
