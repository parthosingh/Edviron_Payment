import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { HdfcService } from 'src/hdfc/hdfc.service';
import { PhonepeService } from 'src/phonepe/phonepe.service';
import { EdvironPgService } from '../edviron-pg/edviron-pg.service';
import { platformChange } from './collect.controller';
export declare class CollectService {
    private readonly phonepeService;
    private readonly hdfcService;
    private readonly edvironPgService;
    private readonly databaseService;
    constructor(phonepeService: PhonepeService, hdfcService: HdfcService, edvironPgService: EdvironPgService, databaseService: DatabaseService);
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    collect(amount: Number, callbackUrl: string, clientId: string, clientSecret: string, school_id: string, trustee_id: string, disabled_modes?: string[], webHook?: string, additional_data?: {}): Promise<{
=======
=======
>>>>>>> 4635644 (add type)
<<<<<<< HEAD
    collect(amount: Number, callbackUrl: string, clientId: string, clientSecret: string, school_id: string, trustee_id: string, disabled_modes?: string[], webHook?: string, additional_data?: {}, student_id?: string, student_email?: string, student_name?: string, student_phone?: string, student_receipt?: string): Promise<{
=======
    collect(amount: Number, callbackUrl: string, clientId: string, clientSecret: string, platform_charges: any, webHook?: string, disabled_modes?: string[]): Promise<{
>>>>>>> 0081548 (adding MDR)
<<<<<<< HEAD
>>>>>>> a1ec662 (adding MDR)
=======
=======
    collect(amount: Number, callbackUrl: string, clientId: string, clientSecret: string, platform_charges: platformChange[], webHook?: string, disabled_modes?: string[]): Promise<{
>>>>>>> 5d9361b (add type)
>>>>>>> 4635644 (add type)
=======
    collect(amount: Number, callbackUrl: string, clientId: string, clientSecret: string, school_id: string, trustee_id: string, disabled_modes: string[] | undefined, platform_charges: platformChange[], webHook?: string, additional_data?: {}, student_id?: string, student_email?: string, student_name?: string, student_phone?: string, student_receipt?: string): Promise<{
>>>>>>> 821a0c6 (rebased with main)
        url: string;
        request: CollectRequest;
    }>;
}
