import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

@Schema({ timestamps: true })
export class ErrorLogs {
  @Prop({})
  school_id: string;

  @Prop({})
  trustee_id: string;

  @Prop({})
  student_id: string;

  @Prop({})
  student_name: string;

  @Prop({})
  student_number: string;

  @Prop({})
  student_email: string;

  @Prop({})
  additional_data: string;

  @Prop({})
  amount: number;

  @Prop({})
  net_amount: number;

  @Prop({})
  discount: number;

  @Prop({})
  year: string;

  @Prop({})
  month: string;

  @Prop({
    required: false,
    type: [
      {
        label: { type: String, required: true },
        amount: { type: Number, required: true },
        net_amount: { type: Number, required: true },
        discount: { type: Number, required: true },
        gst: { type: Number, required: true },
      },
    ],
  })
  installments: {
    label: string;
    amount: number;
    net_amount: number;
    discount: number;
    gst: number;
  }[];

  
  @Prop({})
  label: string;

  @Prop({})
  body: string;
}

export type ErrorLogsDocument = ErrorLogs & Document;
export const ErrorLogsSchema = SchemaFactory.createForClass(ErrorLogs);
