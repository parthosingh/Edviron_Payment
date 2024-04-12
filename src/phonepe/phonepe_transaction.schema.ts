import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class PhonePeTransaction {
  @Prop({ required: true })
  collectRequestId: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type PhonePeTransactionDocument = PhonePeTransaction & Document;
export const PhonePeTransactionSchema =
  SchemaFactory.createForClass(PhonePeTransaction);
