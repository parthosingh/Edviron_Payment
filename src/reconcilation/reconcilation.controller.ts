import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import { ReconcilationService } from './reconcilation.service';
@Controller('reconcilation')
export class ReconcilationController {
    constructor(
        private databaseService: DatabaseService,
        private reconService: ReconcilationService
    ) { }


    @Post('transactions-info')
    async easebuzzRecon(
        @Body() body: {
            sign: string,
            collect_ids: string[]
            utr: string,
            school_name: string
        }
    ) {
        const { sign, utr, collect_ids, school_name } = body
        try {
            if (!sign || !utr || !collect_ids || collect_ids.length === 0) {
                throw new BadRequestException(`Required Field Missing`)
            }

            const decoded = jwt.verify(sign, process.env.KEY!) as { utr: string }

            if (decoded.utr !== utr) {
                throw new BadRequestException(`Request Fordge | Invalid Sign`)
            }

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
                        custom_order_id: '$collectRequest.custom_order_id',
                        collect_id: 1,
                        order_id: '$collect_id',
                        event_status: '$status',
                        event_settlement_amount: '$order_amount',
                        event_time: '$payment_time',
                        event_amount: '$transaction_amount',
                        payment_time: 1,
                        order_amount: 1,
                        transaction_amount: 1,
                        additional_data: '$collectRequest.additional_data',
                        payment_group: 1,
                        details: 1,
                        school_id: '$collectRequest.school_id',
                        payment_id: 1
                    }
                }
            ])

            const formattedInfo = aggregation.map((data: any) => {
                const additional_data = JSON.parse(data.additional_data) || {}
                return {
                    ...data,
                    settlement_utr: utr,
                    student_id: additional_data.student_details?.student_id || 'NA',
                    school_name: school_name,
                    student_name: additional_data.student_details?.student_name || 'NA',
                    student_email: additional_data.student_details?.student_email || 'NA',
                    student_phone_no: additional_data.student_details?.student_phone_no || 'NA',
                }
            })

            return formattedInfo

        }
        catch (e) {
            console.log(e);

            throw new BadRequestException(e.message)
        }
    }

    @Post('/event')
    async createCronEvent(
        @Body() body: {
            event: string
        }
    ) {
        try {
            return await this.reconService.createCronEvent(body.event)
        } catch (e) {
            throw new BadRequestException(e.message)
        }
    }


  @Post('/get-school-mdr')
  async getSchoolMdr(@Body() body: {
    school_id: string
  }) {
    try{
      console.log('here');
      
      const {school_id}=body
      const mdr=await this.databaseService.PlatformChargeModel.findOne({school_id})
      if(mdr){
        return{
          status:true,
          mdr:mdr.platform_charges
        }
      }

      return {
        sattus:false,
        mdr:null
      }
    }catch(e){
      throw new BadRequestException(e.message)
    }
  }
}
