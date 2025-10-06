import mongoose, { ObjectId } from 'mongoose';
export declare class StudentSchema {
    createdAt?: Date;
    updatedAt?: Date;
    student_id: string;
    school_id: string;
    trustee_id: string;
    name: string;
    email: string;
    number: string;
    other_info: string;
    _id: ObjectId;
}
export type StudentSchemaDocument = StudentSchema & Document;
export declare const StudentSchemaSchema: mongoose.Schema<StudentSchema, mongoose.Model<StudentSchema, any, any, any, mongoose.Document<unknown, any, StudentSchema> & StudentSchema & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, StudentSchema, mongoose.Document<unknown, {}, mongoose.FlatRecord<StudentSchema>> & mongoose.FlatRecord<StudentSchema> & Required<{
    _id: mongoose.Schema.Types.ObjectId;
}>>;
