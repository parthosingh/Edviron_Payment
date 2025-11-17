import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class CronManagement {
    @Prop({ required: true })
    event: string;

    @Prop()
    error_msg?:string

    @Prop()
    startDate: Date

    @Prop()
    endDate: Date

    @Prop()
    createdAt?: Date;

    @Prop()
    updatedAt?: Date;
}

export type CronManagementDocument= CronManagement & Document
export const CronManagementSchema=SchemaFactory.createForClass(CronManagement)