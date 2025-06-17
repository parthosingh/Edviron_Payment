export declare class GatepayService {
    constructor();
    encryptEas(data: any, keyBase64: string, ivBase64: string): Promise<any>;
    createOrder(request: any): Promise<{
        url: string;
        collect_req: any;
    }>;
}
