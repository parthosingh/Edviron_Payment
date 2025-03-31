import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId, Types } from 'mongoose';
import { CollectRequest, Gateway } from './collect_request.schema';

export enum charge_type {
  FLAT = 'FLAT',
  PERCENT = 'PERCENT',
}

@Schema()
export class rangeCharge {
  @Prop()
  upto: number;

  @Prop()
  charge_type: charge_type;

  @Prop()
  charge: number;
}

@Schema()
export class PlatformCharge {
  @Prop({ type: String, required: false })
  platform_type: string;

  @Prop({ type: String, required: false })
  payment_mode: string;

  @Prop()
  range_charge: rangeCharge[];
}

@Schema({ timestamps: true })
export class SchoolMdr {
  @Prop()
  platform_charges: PlatformCharge[];

  @Prop({ type: Types.ObjectId })
  school_id: ObjectId;

  @Prop({ type: Types.ObjectId })
  trustee_id: ObjectId;

  @Prop()
  comment: string;
}
export type SchoolMdrDocument = SchoolMdr & Document;
export const SchoolMdrSchema = SchemaFactory.createForClass(SchoolMdr);
