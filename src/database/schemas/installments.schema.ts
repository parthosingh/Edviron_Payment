import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

@Schema({ timestamps: true })
export class Installments {
  @Prop({})
  school_id: string;


  @Prop({
    ref: 'CollectRequest',
    type: mongoose.Schema.Types.ObjectId,
  })
  collect_id: CollectRequest;

  @Prop({})
  trustee_id: string;

  @Prop({
    ref : 'StudentDetails'
  })
  student_id: string;

  @Prop({})
  student_name: string;

  @Prop({})
  status: string;

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
        discount: { type: Number, required: false },
        gst: { type: Number, required: false },
      },
    ],
  })
  fee_heads: {
    label: string;
    amount: number;
    net_amount: number;
    discount: number;
  }[];


  @Prop({})
  label: string;

  @Prop({})
  gst: string;
}

export type InstallmentsDocument = Installments & Document;
export const InstallmentsSchema = SchemaFactory.createForClass(Installments);
