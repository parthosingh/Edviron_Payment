import mongoose from 'mongoose';
export declare class ErrorLogs {
    type: string;
    des: string;
    body: string;
}
export type ErrorLogsDocument = ErrorLogs & Document;
export declare const ErrorLogsSchema: mongoose.Schema<ErrorLogs, mongoose.Model<ErrorLogs, any, any, any, mongoose.Document<unknown, any, ErrorLogs> & ErrorLogs & {
    _id: mongoose.Types.ObjectId;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, ErrorLogs, mongoose.Document<unknown, {}, mongoose.FlatRecord<ErrorLogs>> & mongoose.FlatRecord<ErrorLogs> & {
    _id: mongoose.Types.ObjectId;
}>;
