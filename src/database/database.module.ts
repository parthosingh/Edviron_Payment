import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CollectRequest, CollectRequestSchema } from "./schemas/collect_request.schema";
import { DatabaseService } from "./database.service";
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    MongooseModule.forFeature([{ name: CollectRequest.name, schema: CollectRequestSchema }]),
  ],
  providers: [DatabaseService],
  exports: [
    DatabaseService,
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    MongooseModule.forFeature([{ name: CollectRequest.name, schema: CollectRequestSchema }]),
  ]
})
export class DatabaseModule {}