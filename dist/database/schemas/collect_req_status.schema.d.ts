import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';
export declare enum PaymentStatus {
    SUCCESS = "SUCCESS",
    FAIL = "FAIL",
    PENDING = "PENDING",
    EXPIRED = "EXPIRED",
    FAILURE = "FAILURE",
    AUTO_REFUND = "AUTO_REFUND",
    USER_DROPPED = "USER_DROPPED"
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
    payment_time: Date;
    isAttempted: boolean;
    isAutoRefund: boolean;
    _id: ObjectId;
}
export type CollectRequestStatusDocument = CollectRequestStatus & Document;
export declare const CollectRequestStatusSchema: mongoose.Schema<CollectRequestStatus, mongoose.Model<CollectRequestStatus, any, any, any, mongoose.Document<unknown, any, CollectRequestStatus> & CollectRequestStatus & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, CollectRequestStatus, mongoose.Document<unknown, {}, mongoose.FlatRecord<CollectRequestStatus>> & mongoose.FlatRecord<CollectRequestStatus> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
