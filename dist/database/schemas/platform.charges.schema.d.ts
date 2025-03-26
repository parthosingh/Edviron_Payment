import mongoose, { ObjectId, Types } from 'mongoose';
export declare enum charge_type {
    FLAT = "FLAT",
    PERCENT = "PERCENT"
}
export declare class rangeCharge {
    upto: number;
    charge_type: charge_type;
    charge: number;
}
export declare class PlatformCharge {
    platform_type: string;
    payment_mode: string;
    range_charge: rangeCharge[];
}
export declare class SchoolMdr {
    platform_charges: PlatformCharge[];
    school_id: ObjectId;
    trustee_id: ObjectId;
    comment: string;
}
export type SchoolMdrDocument = SchoolMdr & Document;
export declare const SchoolMdrSchema: mongoose.Schema<SchoolMdr, mongoose.Model<SchoolMdr, any, any, any, mongoose.Document<unknown, any, SchoolMdr> & SchoolMdr & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, SchoolMdr, mongoose.Document<unknown, {}, mongoose.FlatRecord<SchoolMdr>> & mongoose.FlatRecord<SchoolMdr> & {
    _id: Types.ObjectId;
}>;
