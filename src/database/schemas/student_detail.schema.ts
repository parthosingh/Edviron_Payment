import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

@Schema({ timestamps: true })
export class StudentDetail {
  @Prop({})
  student_id: string;

  @Prop({})
  student_name: string;

  @Prop({})
  trustee_id: string;

  @Prop({})
  school_id: string;

  @Prop({})
  student_email: string;
}

export type StudentDetails = StudentDetail & Document;
export const StudentDetailSchema = SchemaFactory.createForClass(StudentDetail);
