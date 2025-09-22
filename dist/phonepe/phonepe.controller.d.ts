import { DatabaseService } from 'src/database/database.service';
export declare class PhonepeController {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    handleRedirect(body: any, res: any): Promise<void>;
    handleCallback(body: any): Promise<string>;
}
