/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose" />
/// <reference types="mongoose/types/inferschematype" />
import { DatabaseService } from 'src/database/database.service';
import { Installments } from 'src/database/schemas/installments.schema';
import { EdvironPayService } from './edviron-pay.service';
export declare class EdvironPayController {
    private readonly databaseService;
    private readonly edvironPay;
    constructor(databaseService: DatabaseService, edvironPay: EdvironPayService);
    upsertInstallments(body: any): Promise<{
        status: string;
    }>;
    collect(body: {
        isInstallment: boolean;
        InstallmentsIds: string[];
        school_id: string;
        trustee_id: string;
        callback_url: string;
        webhook_url: string;
        token: string;
        gateway: {
            cashfree: boolean;
            razorpay: boolean;
            easebuzz: boolean;
        };
        amount: number;
        disable_mode: string[];
        custom_order_id?: string;
        school_name: string;
        isSplit?: boolean;
        isVBAPayment?: boolean;
        additional_data?: {};
        cashfree: {
            client_id: string;
            client_secret: string;
            api_key: string;
            isSeamless: boolean;
            isPartner: boolean;
            isVba: boolean;
            vba: {
                vba_account_number: string;
                vba_ifsc: string;
            };
            cashfreeVedors?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                }
            ];
        };
        razorpay: {
            key_id: string;
            key_secret: string;
            isSeamless: boolean;
            isPartner: boolean;
        };
        easebuzz: {
            mid: string;
            key: string;
            salt: string;
            isPartner: boolean;
            bank_label?: string;
            easebuzzVendors?: [
                {
                    vendor_id: string;
                    percentage?: number;
                    amount?: number;
                    name?: string;
                }
            ];
        };
    }): Promise<{
        collect_request_id: import("mongoose").Schema.Types.ObjectId;
        url: string;
    } | undefined>;
    getStudentInstallments(student_id: string): Promise<(import("mongoose").Document<unknown, {}, import("src/database/schemas/installments.schema").InstallmentsDocument> & Installments & Document & {
        _id: import("mongoose").Types.ObjectId;
    })[] | undefined>;
    getInstallCallbackCashfree(collect_id: string): Promise<void>;
    getVendorsForSchool(school_id: string): Promise<any>;
}
