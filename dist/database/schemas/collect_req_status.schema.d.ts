import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';
export declare enum PaymentStatus {
    SUCCESS = "SUCCESS",
    FAIL = "FAIL",
    PENDING = "PENDING"
}
export declare class CollectRequestStatus {
    createdAt?: Date;
    updatedAt?: Date;
    collect_id: CollectRequest;
    status: PaymentStatus;
    order_amount: Number;
    transaction_amount: Number;
    payment_method: String;
    _id: ObjectId;
}
export type CollectRequestStatusDocument = CollectRequestStatus & Document;
export declare const CollectRequestStatusSchema: mongoose.Schema<CollectRequestStatus, mongoose.Model<CollectRequestStatus, any, any, any, mongoose.Document<unknown, any, CollectRequestStatus> & CollectRequestStatus & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, CollectRequestStatus, mongoose.Document<unknown, {}, mongoose.FlatRecord<CollectRequestStatus>> & mongoose.FlatRecord<CollectRequestStatus> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
