import { DatabaseService } from 'src/database/database.service';
import { Non_Seamless_Payment_Links } from 'src/database/schemas/collect_request.schema';
export declare class GatewayController {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getGatewayLinks(collect_id: string): Promise<{
        edviron_gateways: {
            cashfree: string | null;
            easebuzz: string | null;
            razopay: string | null;
        } | {};
        banks_gateways: Non_Seamless_Payment_Links | {};
    } | null>;
}
