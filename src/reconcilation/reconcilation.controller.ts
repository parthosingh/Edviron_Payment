import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
@Controller('reconcilation')
export class ReconcilationController {
    constructor(
        private databaseService: DatabaseService
    ) { }


    @Post('transactions-info')
    async easebuzzRecon(
        @Body() body: {
            sign: string,
            utr: string,
            collect_ids: string[]
        }
    ) {
        const { sign, utr, collect_ids } = body
        try {
            if (!sign || !utr || !collect_ids || collect_ids.length === 0) {
                console.log({
                    sign,
                    utr,
                    collect_ids
                });

                throw new BadRequestException(`Required Field Missing`)
            }

            const decoded = jwt.verify(sign, process.env.KEY!) as { utr: string }

            if (decoded.utr !== utr) {
                throw new BadRequestException(`Request Fordge | Invalid Sign`)
            }
            console.log(collect_ids);


            const collectObjectIds = collect_ids.map(id => {
                const cleanId = id.startsWith('upi_') ? id.replace('upi_', '') : id;
                return new Types.ObjectId(cleanId);
            });

            const aggregation = await this.databaseService.CollectRequestStatusModel.aggregate([
                {
                    $match: {
                        collect_id: { $in: collectObjectIds }
                    }
                },
                {
                    $lookup: {
                        from: 'collectrequests',
                        localField: 'collect_id',
                        foreignField: '_id',
                        as: 'collectRequest'
                    }
                },
                {
                    $unwind: {
                        path: '$collectRequest'
                    }
                },
                {
                    $project: {
                        _id: 0,
                        collect_id: 1,
                        payment_time: 1,
                        order_amount: 1,
                        transaction_amount: 1,
                        custom_order_id: '$collectRequest.custom_order_id',
                        additional_data: '$collectRequest.additional_data',
                        paymenth_method: 1,
                        details: 1,
                    }
                }
            ])

            return aggregation

        }
        catch (e) {
            console.log(e);

            throw new BadRequestException(e.message)
        }
    }
}
