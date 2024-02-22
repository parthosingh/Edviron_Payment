import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CollectRequest, CollectRequestDocument } from './schemas/collect_request.schema';
import { Model } from 'mongoose';
import { Webhooks } from './schemas/webhooks.schema';
import {
  CollectRequestStatus,
  CollectRequestStatusDocument,
} from './schemas/collect_req_status.schema';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel(CollectRequest.name)
    public CollectRequestModel: Model<CollectRequestDocument>,
    @InjectModel(Webhooks.name)
    public WebhooksModel: Model<CollectRequestDocument>,
    @InjectModel(CollectRequestStatus.name)
    public CollectRequestStatusModel: Model<CollectRequestStatusDocument>,
  ) {}
}
