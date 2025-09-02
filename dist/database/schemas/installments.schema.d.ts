import mongoose from 'mongoose';
import { CollectRequest } from './collect_request.schema';
export declare class Installments {
    school_id: string;
    collect_id: CollectRequest;
    trustee_id: string;
    student_id: string;
    student_name: string;
    status: string;
    student_number: string;
    student_email: string;
    additional_data: string;
    amount: number;
    net_amount: number;
    discount: number;
    year: string;
    month: string;
    fee_heads: {
        label: string;
        amount: number;
        net_amount: number;
        discount: number;
    }[];
    label: string;
    gst: string;
}
export type InstallmentsDocument = Installments & Document;
export declare const InstallmentsSchema: mongoose.Schema<Installments, mongoose.Model<Installments, any, any, any, mongoose.Document<unknown, any, Installments> & Installments & {
    _id: mongoose.Types.ObjectId;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Installments, mongoose.Document<unknown, {}, mongoose.FlatRecord<Installments>> & mongoose.FlatRecord<Installments> & {
    _id: mongoose.Types.ObjectId;
}>;
