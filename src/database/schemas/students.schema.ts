import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';

@Schema({ timestamps: true })
export class StudentSchema {
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({required:true})
  student_id:string

  @Prop({required:true})
  school_id:string
  
  @Prop({required:true})
  trustee_id:string
  
  @Prop({required:true})
  name:string
  
  @Prop({required:true})
  email:string
  
  @Prop({required:true})
  number:string
  
  @Prop({required:false})
  other_info:string

  _id: ObjectId;
}

export type StudentSchemaDocument = StudentSchema & Document;
export const StudentSchemaSchema =
  SchemaFactory.createForClass(StudentSchema);
