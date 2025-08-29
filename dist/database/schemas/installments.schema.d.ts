import mongoose from 'mongoose';
export declare class ErrorLogs {
    school_id: string;
    trustee_id: string;
    student_id: string;
    student_name: string;
    student_number: string;
    student_email: string;
    additional_data: string;
    amount: number;
    net_amount: number;
    discount: number;
    year: string;
    month: string;
    installments: {
        label: string;
        amount: number;
        net_amount: number;
        discount: number;
        gst: number;
    }[];
    label: string;
    body: string;
}
export type ErrorLogsDocument = ErrorLogs & Document;
export declare const ErrorLogsSchema: mongoose.Schema<ErrorLogs, mongoose.Model<ErrorLogs, any, any, any, mongoose.Document<unknown, any, ErrorLogs> & ErrorLogs & {
    _id: mongoose.Types.ObjectId;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, ErrorLogs, mongoose.Document<unknown, {}, mongoose.FlatRecord<ErrorLogs>> & mongoose.FlatRecord<ErrorLogs> & {
    _id: mongoose.Types.ObjectId;
}>;
