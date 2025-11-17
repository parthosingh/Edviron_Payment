import { DatabaseService } from 'src/database/database.service';
export declare class ReconcilationService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    reconPendingGateway(): Promise<void>;
    reconStatus(): Promise<void>;
    terminateNotInitiatedOrder(collect_id: string): Promise<true | undefined>;
    createCronEvent(event: string): Promise<void>;
}
