import { DatabaseService } from 'src/database/database.service';
export declare class EasebuzzController {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getQr(res: any, req: any): Promise<any>;
    getEncryptedInfo(res: any, req: any, body: any): Promise<any>;
    getRefundhash(req: any): Promise<any>;
}
