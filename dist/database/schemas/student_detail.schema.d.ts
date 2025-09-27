import mongoose from 'mongoose';
export declare class StudentDetail {
    student_id: string;
    student_name: string;
    trustee_id: string;
    school_id: string;
    student_email: string;
}
export type StudentDetails = StudentDetail & Document;
export declare const StudentDetailSchema: mongoose.Schema<StudentDetail, mongoose.Model<StudentDetail, any, any, any, mongoose.Document<unknown, any, StudentDetail> & StudentDetail & {
    _id: mongoose.Types.ObjectId;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, StudentDetail, mongoose.Document<unknown, {}, mongoose.FlatRecord<StudentDetail>> & mongoose.FlatRecord<StudentDetail> & {
    _id: mongoose.Types.ObjectId;
}>;
