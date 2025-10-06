import { EasebuzzService } from 'src/easebuzz/easebuzz.service';
export declare class EdvironSeamlessService {
    private readonly easebuzzService;
    constructor(easebuzzService: EasebuzzService);
    processcards(enc_card_number: string, enc_card_holder_name: string, enc_card_cvv: string, enc_card_expiry_date: string, school_id: string, collect_id: string): Promise<{
        card_number: string;
        card_holder: string;
        card_cvv: string;
        card_exp: string;
    }>;
}
