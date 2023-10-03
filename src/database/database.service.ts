import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CollectRequest, CollectRequestDocument } from './schemas/collect_request.schema';
import { Model } from 'mongoose';

@Injectable()
export class DatabaseService {
    constructor(
        @InjectModel(CollectRequest.name) public CollectRequestModel: Model<CollectRequestDocument>,
    ){}
}
