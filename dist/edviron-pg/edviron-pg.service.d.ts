import { CollectRequest } from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus } from '../types/transactionStatus';
import { platformChange } from 'src/collect/collect.controller';
import { CashfreeService } from 'src/cashfree/cashfree.service';
export declare class EdvironPgService implements GatewayService {
    private readonly databaseService;
    private readonly cashfreeService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService);
    collect(request: CollectRequest, platform_charges: platformChange[], school_name: any): Promise<Transaction | undefined>;
    checkStatus(collect_request_id: String, collect_request: CollectRequest): Promise<{
        status: TransactionStatus;
        amount: number;
        status_code?: number;
        details?: any;
        custom_order_id?: string;
    }>;
    terminateOrder(collect_id: string): Promise<boolean>;
    easebuzzCheckStatus(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
    getPaymentDetails(school_id: string, startDate: string, mode: string): Promise<any[]>;
    getQr(collect_id: string, request: CollectRequest): Promise<void>;
    getSchoolInfo(school_id: string): Promise<any>;
    sendTransactionmail(email: string, request: CollectRequest): Promise<string>;
    sendErpWebhook(webHookUrl: string[], webhookData: any): Promise<void>;
    test(): Promise<void>;
}
