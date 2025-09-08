/// <reference types="node" />
export declare class AwsS3ServiceService {
    private s3Bucket;
    constructor();
    uploadToS3(fileBuffer: Buffer, key: string, contentType: string, bucketName: string): Promise<string>;
    deleteFromS3(key: string, bucketName: string): Promise<string>;
}
