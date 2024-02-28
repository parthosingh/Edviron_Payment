import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CollectRequest, CollectRequestSchema } from "./schemas/collect_request.schema";
import { DatabaseService } from "./database.service";
import * as dotenv from 'dotenv';
import {
  CollectRequestStatus,
  CollectRequestStatusSchema,
} from './schemas/collect_req_status.schema';
import { Webhooks, WebhooksSchema } from './schemas/webhooks.schema';
dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    MongooseModule.forFeature([
      { name: CollectRequest.name, schema: CollectRequestSchema },
    ]),
    MongooseModule.forFeature([
      { name: CollectRequestStatus.name, schema: CollectRequestStatusSchema },
    ]),
    MongooseModule.forFeature([
      { name: Webhooks.name, schema: WebhooksSchema },
    ]),
  ],
  providers: [DatabaseService],
  exports: [
    DatabaseService,
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    MongooseModule.forFeature([
      { name: CollectRequest.name, schema: CollectRequestSchema },
    ]),
    MongooseModule.forFeature([
      { name: CollectRequestStatus.name, schema: CollectRequestStatusSchema },
    ]),
    MongooseModule.forFeature([
      { name: Webhooks.name, schema: WebhooksSchema },
    ]),
  ],
})
export class DatabaseModule {}