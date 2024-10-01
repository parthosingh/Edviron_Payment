export declare const sign: (body: any) => Promise<any>;
export declare const calculateSHA512Hash: (data: any) => Promise<any>;
export declare const calculateSHA256: (data: any) => Promise<any>;
export declare const merchantKeySHA256: () => Promise<{
    key: any;
    iv: any;
}>;
export declare const encryptCard: (data: string, key: string, iv: string) => Promise<any>;
export declare const decrypt: (encryptedData: string, key: string, iv: string) => Promise<any>;
