import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest, Gateway } from './collect_request.schema';
export declare class VendorTransaction {
    amount: number;
    createdAt?: Date;
    updatedAt?: Date;
    collect_id: CollectRequest;
    gateway: Gateway;
    status: string;
    vendor_id: string;
    school_id: string;
    trustee_id: string;
    custom_order_id: string;
    name: string;
    _id: ObjectId;
}
export type VendorTransactionDocument = VendorTransaction & Document;
export declare const VendorTransactionSchema: mongoose.Schema<VendorTransaction, mongoose.Model<VendorTransaction, any, any, any, mongoose.Document<unknown, any, VendorTransaction> & VendorTransaction & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, VendorTransaction, mongoose.Document<unknown, {}, mongoose.FlatRecord<VendorTransaction>> & mongoose.FlatRecord<VendorTransaction> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
