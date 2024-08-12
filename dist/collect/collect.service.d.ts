import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { platformChange } from './collect.controller';
import { CcavenueService } from 'src/ccavenue/ccavenue.service';
export declare class CollectService {
    private readonly phonepeService;
    private readonly hdfcService;
    private readonly edvironPgService;
    private readonly databaseService;
    private readonly ccavenueService;
    constructor(phonepeService: PhonepeService, hdfcService: HdfcService, edvironPgService: EdvironPgService, databaseService: DatabaseService, ccavenueService: CcavenueService);
    collect(amount: Number, callbackUrl: string, clientId: string, clientSecret: string, school_id: string, trustee_id: string, disabled_modes: string[] | undefined, platform_charges: platformChange[], webHook?: string, additional_data?: {}, custom_order_id?: string, req_webhook_urls?: string[], school_name?: string, easebuzz_sub_merchant_id?: string, ccavenue_merchant_id?: string, ccavenue_access_code?: string, ccavenue_working_key?: string): Promise<{
        url: string;
        request: CollectRequest;
    }>;
}
