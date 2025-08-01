import { Module } from '@nestjs/common';
import { AwsS3ServiceService } from './aws-s3-service.service';

@Module({
  providers: [AwsS3ServiceService]
})
export class AwsS3ServiceModule {}
