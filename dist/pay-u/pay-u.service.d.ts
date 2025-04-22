import { DatabaseService } from 'src/database/database.service';
export declare class PayUService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    generate512HASH(key: string, txnid: string, amount: number, salt: string): Promise<any>;
    checkStatus(collect_id: string): Promise<{
        status: any;
        amount: number;
        transaction_amount: number;
        status_code: number;
        details: {
            payment_mode: any;
            bank_ref: any;
            payment_methods: {};
            transaction_time: any;
        };
        mode: any;
        net_amount_debit: any;
        bank_ref_num: any;
    }>;
    terminateOrder(collect_id: string): Promise<boolean>;
}
