import mongoose, { ObjectId } from 'mongoose';
export declare class BatchTransactions {
    trustee_id: string;
    total_order_amount: Number;
    total_transaction_amount: Number;
    total_transactions: Number;
    month: string;
    year: string;
    updatedAt?: Date;
    status: string;
    _id: ObjectId;
}
export type BatchTransactionsDocument = BatchTransactions & Document;
export declare const BatchTransactionsSchema: mongoose.Schema<BatchTransactions, mongoose.Model<BatchTransactions, any, any, any, mongoose.Document<unknown, any, BatchTransactions> & BatchTransactions & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, BatchTransactions, mongoose.Document<unknown, {}, mongoose.FlatRecord<BatchTransactions>> & mongoose.FlatRecord<BatchTransactions> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
