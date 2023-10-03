import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';

@Schema({ timestamps: true })
export class CollectRequest {
    @Prop({required: true})
    amount: number;

    @Prop()
    createdAt?: Date;

    @Prop()
    updatedAt?: Date;

    @Prop({required: true})
    callbackUrl: string;

    _id: ObjectId;
}

export type CollectRequestDocument = CollectRequest & Document;
export const CollectRequestSchema = SchemaFactory.createForClass(CollectRequest);
