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
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
import { EdvironPgService } from 'src/edviron-pg/edviron-pg.service';
export declare class EdvironPayService {
    private readonly databaseService;
    private readonly cashfreeService;
    private readonly easebuzzService;
    private readonly edvironPgService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService, easebuzzService: EasebuzzService, edvironPgService: EdvironPgService);
    vpaOrder(request: CollectRequest): Promise<any>;
    createOrder(request: CollectRequest, school_name: string, gatewat: {
        cashfree: boolean;
        easebuzz: boolean;
        razorpay: boolean;
    }, platform_charges: any): Promise<{
        collect_request_id: import("mongoose").Schema.Types.ObjectId;
        url: string;
    }>;
    createStudent(student_detail: {
        student_id: string;
        student_name: string;
        student_email: string;
        student_number: string;
        student_class?: string;
        section?: string;
        gender?: string;
        additional_info?: string;
    }, school_id: string, trustee_id: string): Promise<(import("mongoose").Document<unknown, {}, import("../database/schemas/student_detail.schema").StudentDetails> & import("../database/schemas/student_detail.schema").StudentDetail & Document & {
        _id: import("mongoose").Types.ObjectId;
    }) | null>;
    studentFind(student_id: string, school_id: string, trustee_id: string): Promise<import("mongoose").Document<unknown, {}, import("../database/schemas/student_detail.schema").StudentDetails> & import("../database/schemas/student_detail.schema").StudentDetail & Document & {
        _id: import("mongoose").Types.ObjectId;
    }>;
    nonEdvironInstallments(collect_id: string): Promise<"installments update successfull" | "no installment found for this collect id">;
}
