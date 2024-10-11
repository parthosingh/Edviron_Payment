import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
import { CollectRequest } from './collect_request.schema';

@Schema({ timestamps: true })
export class ErrorLogs {
  @Prop({})
  type: string;

  @Prop({})
  des: string;

  @Prop({})
  body: string;
}

export type ErrorLogsDocument = ErrorLogs & Document;
export const ErrorLogsSchema = SchemaFactory.createForClass(ErrorLogs);
