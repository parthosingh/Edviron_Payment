import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';

export enum Gateway {
    PHONEPE = "PHONEPE",
    HDFC = "HDFC",
    EDVIRON_PG = "EDVIRON_PG"
}

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

    @Prop({required: true, default: Gateway.PHONEPE})
    gateway: Gateway

    @Prop({required: false})
    clientId: string;

    @Prop({required: false})
    clientSecret: string;

    _id: ObjectId;
}

export type CollectRequestDocument = CollectRequest & Document;
export const CollectRequestSchema = SchemaFactory.createForClass(CollectRequest);
