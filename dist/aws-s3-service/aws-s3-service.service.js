"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsS3ServiceService = void 0;
const common_1 = require("@nestjs/common");
const AWS = require("aws-sdk");
let AwsS3ServiceService = class AwsS3ServiceService {
    constructor() {
        if (process.env.NODE_ENV !== 'test')
            this.s3Bucket = new AWS.S3({
                region: 'ap-south-1',
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                },
            });
    }
    async uploadToS3(fileBuffer, key, contentType, bucketName) {
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
        };
        await this.s3Bucket.upload(params).promise();
        return `https://${bucketName}.s3.amazonaws.com/${key}`;
    }
    async deleteFromS3(key, bucketName) {
        try {
            const params = {
                Bucket: bucketName,
                Key: key,
            };
            await this.s3Bucket.deleteObject(params).promise();
            return 'File removed successfully from S3';
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message || 'Something went wrong');
        }
    }
};
exports.AwsS3ServiceService = AwsS3ServiceService;
exports.AwsS3ServiceService = AwsS3ServiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AwsS3ServiceService);
//# sourceMappingURL=aws-s3-service.service.js.map