export declare const sign: (body: any) => Promise<any>;
export declare const calculateSHA512Hash: (data: any) => Promise<any>;
export declare const calculateSHA256: (data: any) => Promise<any>;
export declare const merchantKeySHA256: () => Promise<{
    key: any;
    iv: any;
}>;
export declare const generateHMACBase64Type: (signed_payload: string, secret: string) => any;
export declare const encryptCard: (data: string, key: string, iv: string) => Promise<any>;
export declare const decrypt: (encryptedData: string, key: string, iv: string) => Promise<any>;
export declare const generateSignature: (merchID: string, password: string, merchTxnID: string, amount: string, txnCurrency: string, txnType: string, coll_req: any) => any;
