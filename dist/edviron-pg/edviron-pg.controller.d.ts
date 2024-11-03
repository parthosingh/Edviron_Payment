import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from './edviron-pg.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { CashfreeService } from 'src/cashfree/cashfree.service';
export declare class EdvironPgController {
    private readonly edvironPgService;
    private readonly databaseService;
    private readonly easebuzzService;
    private readonly cashfreeService;
    constructor(edvironPgService: EdvironPgService, databaseService: DatabaseService, easebuzzService: EasebuzzService, cashfreeService: CashfreeService);
    handleRedirect(req: any, res: any): Promise<void>;
    handleSdkRedirect(req: any, res: any): Promise<any>;
    handleCallback(req: any, res: any): Promise<any>;
    handleEasebuzzCallback(req: any, res: any): Promise<any>;
    handleEasebuzzCallbackPost(req: any, res: any): Promise<any>;
    handleWebhook(body: any, res: any): Promise<void>;
    easebuzzWebhook(body: any, res: any): Promise<void>;
    transactionsReport(body: {
        school_id: string;
        token: string;
    }, res: any, req: any): Promise<void>;
    getTransactionInfo(body: {
        school_id: string;
        collect_request_id: string;
        token: string;
    }): Promise<any[]>;
    bulkTransactions(body: {
        trustee_id: string;
        token: string;
    }, res: any, req: any): Promise<void>;
    getErpLogo(collect_id: string): Promise<any>;
    getSchoolId(collect_id: string): Promise<string>;
    easebuzzSettlement(body: any): Promise<void>;
    getGatewayName(req: any): Promise<Gateway>;
    getpaymentRatio(body: {
        school_id: string;
        mode: string;
        start_date: string;
        token?: string;
    }): Promise<{
        cashfreeSum: number;
        easebuzzSum: number;
        percentageCashfree: number;
        percentageEasebuzz: number;
    }>;
    getPgStatus(collect_id: string): Promise<{
        cashfree: boolean;
        easebuzz: boolean;
    }>;
    initiaterefund(body: {
        collect_id: string;
        amount: number;
        refund_id: string;
        token: string;
    }): Promise<any>;
    getRefundStatus(req: any): Promise<any>;
    sentMail(req: any): Promise<void>;
    terminate(req: any): Promise<any>;
    getCustomId(collect_id: string): Promise<string>;
}
