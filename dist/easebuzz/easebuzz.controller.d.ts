import { DatabaseService } from 'src/database/database.service';
export declare class EasebuzzController {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getQr(res: any, req: any): Promise<any>;
}
