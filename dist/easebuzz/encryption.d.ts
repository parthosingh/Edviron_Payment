export declare class EncryptionService {
    private key;
    private iv;
    constructor();
    private initializeKeyAndIV;
    encryptCard(data: string): string;
    encryptCardDetails(cardDetails: {
        card_number: string;
        card_holder_name: string;
        card_cvv: string;
        card_expiry_date: string;
    }): {
        card_number: string;
        card_holder_name: string;
        card_cvv: string;
        card_expiry_date: string;
    };
}
