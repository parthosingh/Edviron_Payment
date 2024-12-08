import { DatabaseService } from 'src/database/database.service';
import { EasebuzzService } from './easebuzz.service';
export declare class EasebuzzController {
    private readonly easebuzzService;
    private readonly databaseService;
    constructor(easebuzzService: EasebuzzService, databaseService: DatabaseService);
    getQr(res: any, req: any): Promise<any>;
    getEncryptedInfo(res: any, req: any, body: any): Promise<any>;
    getRefundhash(req: any): Promise<any>;
    checkRefund(req: any): Promise<any>;
}
