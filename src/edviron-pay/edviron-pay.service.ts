import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';

@Injectable()
export class EdvironPayService {
    constructor(private readonly databaseService: DatabaseService) {}

    async createOrder(
        request:CollectRequest
    ){}
}
