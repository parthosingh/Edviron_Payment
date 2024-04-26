import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { platformChange } from './collect.controller';
export declare class CollectService {
    private readonly phonepeService;
    private readonly hdfcService;
    private readonly edvironPgService;
    private readonly databaseService;
    constructor(phonepeService: PhonepeService, hdfcService: HdfcService, edvironPgService: EdvironPgService, databaseService: DatabaseService);
    collect(amount: Number, callbackUrl: string, clientId: string, clientSecret: string, school_id: string, trustee_id: string, disabled_modes: string[] | undefined, platform_charges: platformChange[], webHook?: string, additional_data?: {}): Promise<{
        url: string;
        request: CollectRequest;
    }>;
}
