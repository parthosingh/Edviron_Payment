import { DatabaseService } from 'src/database/database.service';
import { ReconcilationService } from './reconcilation.service';
export declare class ReconcilationController {
    private databaseService;
    private reconService;
    constructor(databaseService: DatabaseService, reconService: ReconcilationService);
    easebuzzRecon(body: {
        sign: string;
        collect_ids: string[];
        utr: string;
        school_name: string;
    }): Promise<any[]>;
    createCronEvent(body: {
        event: string;
    }): Promise<void>;
}
