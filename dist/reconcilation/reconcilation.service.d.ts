import { DatabaseService } from 'src/database/database.service';
export declare class ReconcilationService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    reconPendingGateway(): Promise<void>;
    reconTerminateOrder(): Promise<void>;
    terminateNotInitiatedOrder(collect_id: string): Promise<true | undefined>;
}
