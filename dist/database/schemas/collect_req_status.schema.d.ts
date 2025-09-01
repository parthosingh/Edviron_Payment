import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';
export declare enum PaymentStatus {
    SUCCESS = "SUCCESS",
    FAIL = "FAIL",
    FAILED = "FAILED",
    PENDING = "PENDING",
    EXPIRED = "EXPIRED",
    FAILURE = "FAILURE",
    AUTO_REFUND = "AUTO_REFUND",
    USER_DROPPED = "USER_DROPPED"
}
interface error_details {
    error_description: string | null;
    error_reason: string | null;
    error_source: string | null;
}
interface vbaPaymentDetails {
    utr: string | null;
    credit_ref_no: string | null;
    remitter_account: string | null;
    remitter_name: string | null;
    remitter_ifsc: string | null;
    email: string | null;
    phone: string | null;
    vaccount_id: string | null;
    vaccount_number: string | null;
}
export declare class CollectRequestStatus {
    createdAt?: Date;
    updatedAt?: Date;
    collect_id: CollectRequest;
    status: String;
    order_amount: Number;
    transaction_amount: Number;
    payment_method: String;
    details: String;
    status_details: String;
    bank_reference: string;
    utr_number: string;
    payment_time: Date;
    settlement_date: Date;
    isAttempted: boolean;
    isAutoRefund: boolean;
    reason: string;
    payment_message: string;
    cf_payment_id: string;
    capture_status: string;
    isVBAPaymentComplete: boolean;
    vbaOrderId: string;
    error_details: error_details;
    isPosTransaction: boolean;
    vbaPaymentDetails: vbaPaymentDetails;
    _id: ObjectId;
}
export type CollectRequestStatusDocument = CollectRequestStatus & Document;
export declare const CollectRequestStatusSchema: mongoose.Schema<CollectRequestStatus, mongoose.Model<CollectRequestStatus, any, any, any, mongoose.Document<unknown, any, CollectRequestStatus> & CollectRequestStatus & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, CollectRequestStatus, mongoose.Document<unknown, {}, mongoose.FlatRecord<CollectRequestStatus>> & mongoose.FlatRecord<CollectRequestStatus> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
export {};
