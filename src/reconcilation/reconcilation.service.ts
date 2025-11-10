import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { Gateway } from 'src/database/schemas/collect_request.schema';

@Injectable()
export class ReconcilationService {
    constructor(
        private readonly databaseService: DatabaseService
    ) { }


    async reconPendingGateway() {
        try {
            const cronManagement = await this.databaseService.cronManagement.findOne({
                event: 'TERMINATE_GATEWAY'
            });

            if (!cronManagement) return;
            if (!cronManagement.startDate || !cronManagement.endDate) return;

            const collectReqs = await this.databaseService.CollectRequestModel.find({
                gateway: "PENDING",
                createdAt: {
                    $gte: cronManagement.startDate,
                    $lte: cronManagement.endDate
                }
            });

            if (!collectReqs.length) return;

            const updates = [];

            for (const req of collectReqs) {
                const reqStatus = await this.databaseService.CollectRequestStatusModel.findOne({ collect_id: req._id });
                if (!reqStatus) continue; // skip if missing
                req.gateway = Gateway.EXPIRED;
                reqStatus.status = PaymentStatus.USER_DROPPED;

                updates.push(req.save(), reqStatus.save());
            }

            await Promise.all(updates);

            console.log(`✅ Updated ${updates.length / 2} records to EXPIRED / USER_DROPPED`);

        } catch (e) {
            try {
                await this.databaseService.cronManagement.create({
                    event: "TERMINATE_GATEWAY_ERROR",
                    error_msg: e.message
                })
                throw new BadRequestException(e.message);
            } catch (e) {
                console.log(e);
            }
            throw new BadRequestException(e.message);
        }
    }

    async reconTerminateOrder() {
        try {
            const cronManagement = await this.databaseService.cronManagement.findOne({
                event: 'TERMINATE_GATEWAY'
            });

            if (!cronManagement) return;
            if (!cronManagement.startDate || !cronManagement.endDate) return;

            const collectReqs = await this.databaseService.CollectRequestStatusModel.find({
                status: "PENDING",
                createdAt: {
                    $gte: cronManagement.startDate,
                    $lte: cronManagement.endDate
                }
            });
            if (!collectReqs.length) return;


            const updates = [];

            for (const req of collectReqs) {
                const reqStatus = await this.databaseService.CollectRequestStatusModel.findOne({ collect_id: req._id });
                if (!reqStatus) continue; // skip if missing
                reqStatus.status = PaymentStatus.USER_DROPPED;

                updates.push(req.save(), reqStatus.save());
            }

            await Promise.all(updates);
            let oldEndDate=cronManagement.endDate
            
            cronManagement.startDate = oldEndDate
            cronManagement.endDate=new Date(Date.now())


        } catch (e) {
            throw new BadRequestException(e.message)
        }
    }

    async terminateNotInitiatedOrder(
        collect_id: string
    ) {
        try {
            const request =
                await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request || !request.createdAt) {
                throw new Error('Collect Request not found');
            }
            const requestStatus =
                await this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: request._id,
                });
            if (!requestStatus) {
                throw new Error('Collect Request Status not found');
            }
            if (requestStatus.status !== 'PENDING') {
                return
            }
            if (request.gateway !== 'PENDING') {
                const config = {
                    method: 'get',
                    url: `${process.env.URL}/check-status?transactionId=${collect_id}`,
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        'x-api-version': '2023-08-01',
                    }
                }
                const { data: status } = await axios.request(config)
                // const status = await this.checkStatusService.checkStatus(request._id.toString())
                if (status.status.toUpperCase() !== 'SUCCESS') {
                    requestStatus.status = PaymentStatus.USER_DROPPED
                    await requestStatus.save()
                }
                return true

            }
            const createdAt = request.createdAt; // Convert createdAt to a Date object
            const currentTime = new Date();
            const timeDifference = currentTime.getTime() - createdAt.getTime();
            const differenceInMinutes = timeDifference / (1000 * 60);


            if (differenceInMinutes > 25) {
                request.gateway = Gateway.EXPIRED
                requestStatus.status = PaymentStatus.USER_DROPPED
                await request.save()
                await requestStatus.save()
                return true
            }

        } catch (e) {
            throw new BadRequestException(e.message)
        }

        return true
    }

}
