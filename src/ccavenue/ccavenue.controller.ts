import { BadRequestException, Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CcavenueService } from './ccavenue.service';
import { Types } from 'mongoose';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { sign } from 'src/utils/sign';
import axios from 'axios';
import { Gateway } from 'src/database/schemas/collect_request.schema';

@Controller('ccavenue')
export class CcavenueController {
  constructor(
    private readonly ccavenueService: CcavenueService,
    private readonly databaseService: DatabaseService,
  ) {}
  @Get('/redirect')
  async handleRedirect(@Req() req: any, @Res() res: any) {
    res.send(
      `<form method="post" name="redirect"
                    action="https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"/>
                    <input type="hidden" id="encRequest" name="encRequest" value="${req.query.encRequest}">
                    <input type="hidden" name="access_code" id="access_code" value="${req.query.access_code}">
                </form>
                
                <script type="text/javascript">
                    window.onload = function(){
                        document.forms['redirect'].submit();
                    }
                </script>`,
    );
  }

  @Post('/callback')
  async handleCallback(@Body() body: any, @Res() res: any, @Req() req: any) {
    console.log('callback recived from ccavenue');
    try {
      console.log(req.query.collect_id);
      const collectIdObject = req.query.collect_id;
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(
          collectIdObject,
        );
      if (!collectReq) throw new Error('Collect request not found');

      collectReq.gateway = Gateway.EDVIRON_CCAVENUE;
      await collectReq.save();

      const status = await this.ccavenueService.checkStatus(
        collectReq,
        collectIdObject,
      );

      const orderDetails = JSON.parse(status.decrypt_res);
      console.log(orderDetails, 'order details');

      console.log(`order details new ${orderDetails.Order_Status_Result}`);
      console.log(
        `order status ${orderDetails.Order_Status_Result.order_status}`,
      );

      const pendingCollectReq =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(req.query.collect_id),
        });

      if (
        pendingCollectReq &&
        pendingCollectReq.status !== PaymentStatus.PENDING
      ) {
        console.log('No pending request found for', req.query.collect_id);
        res.status(200).send('OK');
        return;
      }
      console.log(
        `payment mode ${orderDetails.Order_Status_Result.order_option_type}`,
      );

      let payment_method = orderDetails.Order_Status_Result.order_option_type;
      let details = JSON.stringify(orderDetails);
      if (status.paymentInstrument === 'OPTUPI') {
        payment_method = 'upi';
        const details_data = {
          upi: { channel: null, upi_id: 'NA' },
        };
        details = JSON.stringify(details_data);
      }
      const updateReq =
        await this.databaseService.CollectRequestStatusModel.updateOne(
          {
            collect_id: collectIdObject,
          },
          {
            $set: {
              status: status.status,
              transaction_amount:
                orderDetails.Order_Status_Result.order_gross_amt,
              payment_method: payment_method,
              details: details,
              bank_reference:
                orderDetails.Order_Status_Result.order_bank_ref_no,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );

      const webHookUrl = collectReq?.webHookUrl;

      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(
          collectIdObject,
        );
      const collectRequestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: collectIdObject,
        });

      if (!collectRequest) {
        throw new Error(`transaction not found`);
      }

      const custom_order_id = collectRequest?.custom_order_id || '';
      if (webHookUrl !== null) {
        const amount = orderDetails.Order_Status_Result.order_amt;
        const webHookData = await sign({
          collect_id: req.query.collect_id,
          amount,
          status: status.status,
          trustee_id: collectReq.trustee_id,
          school_id: collectReq.school_id,
          req_webhook_urls: collectReq?.req_webhook_urls,
          custom_order_id,
          createdAt: collectRequestStatus?.createdAt,
          transaction_time: collectRequestStatus?.updatedAt,
        });
        const config = {
          method: 'post',
          maxBodyLength: Infinity,
          url: `${webHookUrl}`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          data: webHookData,
        };
        try {
          const webHookSent = await axios.request(config);
          console.log(`webhook sent to ${webHookUrl} with data ${webHookSent}`);
        } catch (e) {
          console.log(
            ` failed to send webhook to ${webHookUrl} reason ${e.message}`,
          );
        }
      }
      const { encResp } = body;

      const collectRequestId =
        await this.ccavenueService.ccavResponseToCollectRequestId(
          encResp,
          collectRequest.ccavenue_working_key,
        );

      const callbackUrl = new URL(collectRequest?.callbackUrl);
      if (status.status.toUpperCase() !== `SUCCESS`) {
        callbackUrl.searchParams.set('EdvironCollectRequestId', collectIdObject);
        return res.redirect(
          `${callbackUrl.toString()}&status=cancelled&reason=payment-declined`,
        );
      }
      callbackUrl.searchParams.set('EdvironCollectRequestId', collectIdObject);
      callbackUrl.searchParams.set('status', 'SUCCESS');
      return res.redirect(callbackUrl.toString());
    } catch (e) {
      console.log(`Error,${e}`);
      throw new Error(`Error in callback,${e.message}`);
    }
  }

  @Get('/callback')
  async handleCcavenueCallback(
    @Body() body: any,
    @Res() res: any,
    @Req() req: any,
  ) {
    console.log('callback recived from ccavenue');
    try {
      console.log(req.query.collect_id);
      const collectIdObject = req.query.collect_id;
      const collectReq =
        await this.databaseService.CollectRequestModel.findById(
          collectIdObject,
        );
      if (!collectReq) throw new Error('Collect request not found');

      collectReq.gateway = Gateway.EDVIRON_CCAVENUE;
      await collectReq.save();
        if(collectReq.school_id==='6819e115e79a645e806c0a70'){
          console.log('new flow');
          
          const status=await this.ccavenueService.checkStatusProd(
            collectReq,
            collectIdObject
          )
          const requestStatus=await this.databaseService.CollectRequestStatusModel.findOne({collect_id:new Types.ObjectId(collectIdObject)})
          if(!requestStatus){
            throw new BadRequestException('status not foubnd')
          }  
          const  order_info=JSON.parse(status.decrypt_res)
          let payment_method=order_info.order_option_type
          let details=status.decrypt_res

          if (order_info.order_option_type === 'OPTUPI') {
            payment_method = 'upi';
            const details_data = {
              upi: { channel: null, upi_id: 'NA' },
            };
            details = JSON.stringify(details_data);
          }
          requestStatus.status=status.status
          requestStatus.payment_method=payment_method
          requestStatus.details=details

          await requestStatus.save()
          const callbackUrl = new URL(collectReq?.callbackUrl);
          if (status.status.toUpperCase() !== `SUCCESS`) {
            console.log('payment failure',status.status);
            
            return res.redirect(
              `${callbackUrl.toString()}?EdvironCollectRequestId=${collectIdObject}status=cancelled&reason=payment-declined`,
            );
          }
          callbackUrl.searchParams.set('EdvironCollectRequestId', collectIdObject);
          return res.redirect(callbackUrl.toString());
        }
      const status = await this.ccavenueService.checkStatus(
        collectReq,
        collectIdObject,
      );

      const orderDetails = JSON.parse(status.decrypt_res);
      console.log(orderDetails, 'order details');

      console.log(`order details new ${orderDetails.Order_Status_Result}`);
      console.log(
        `order status ${orderDetails.Order_Status_Result.order_status}`,
      );

      const pendingCollectReq =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(req.query.collect_id),
        });

      if (
        pendingCollectReq &&
        pendingCollectReq.status !== PaymentStatus.PENDING
      ) {
        console.log('No pending request found for', req.query.collect_id);
        res.status(200).send('OK');
        return;
      }
      console.log(
        `payment mode ${orderDetails.Order_Status_Result.order_option_type}`,
      );

      let payment_method = orderDetails.Order_Status_Result.order_option_type;
      let details = JSON.stringify(orderDetails);
      if (status.paymentInstrument === 'OPTUPI') {
        payment_method = 'upi';
        const details_data = {
          upi: { channel: null, upi_id: 'NA' },
        };
        details = JSON.stringify(details_data);
      }
      const updateReq =
        await this.databaseService.CollectRequestStatusModel.updateOne(
          {
            collect_id: collectIdObject,
          },
          {
            $set: {
              status: status.status,
              transaction_amount:
                orderDetails.Order_Status_Result.order_gross_amt,
              payment_method: payment_method,
              details: details,
              bank_reference:
                orderDetails.Order_Status_Result.order_bank_ref_no,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );

      const webHookUrl = collectReq?.webHookUrl;

      const collectRequest =
        await this.databaseService.CollectRequestModel.findById(
          collectIdObject,
        );
      const collectRequestStatus =
        await this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: collectIdObject,
        });

      if (!collectRequest) {
        throw new Error(`transaction not found`);
      }

      const custom_order_id = collectRequest?.custom_order_id || '';
      if (webHookUrl !== null) {
        const amount = orderDetails.Order_Status_Result.order_amt;
        const webHookData = await sign({
          collect_id: req.query.collect_id,
          amount,
          status: status.status,
          trustee_id: collectReq.trustee_id,
          school_id: collectReq.school_id,
          req_webhook_urls: collectReq?.req_webhook_urls,
          custom_order_id,
          createdAt: collectRequestStatus?.createdAt,
          transaction_time: collectRequestStatus?.updatedAt,
        });
        const config = {
          method: 'post',
          maxBodyLength: Infinity,
          url: `${webHookUrl}`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          data: webHookData,
        };
        try {
          const webHookSent = await axios.request(config);
          console.log(`webhook sent to ${webHookUrl} with data ${webHookSent}`);
        } catch (e) {
          console.log(
            ` failed to send webhook to ${webHookUrl} reason ${e.message}`,
          );
        }
      }
      const { encResp } = body;

      const collectRequestId =
        await this.ccavenueService.ccavResponseToCollectRequestId(
          encResp,
          collectRequest.ccavenue_working_key,
        );

      const callbackUrl = new URL(collectRequest?.callbackUrl);
      if (status.status.toUpperCase() !== `SUCCESS`) {
        console.log('payment failure',status.status);
        
        return res.redirect(
          `${callbackUrl.toString()}?EdvironCollectRequestId=${collectIdObject}status=cancelled&reason=payment-declined`,
        );
      }
      callbackUrl.searchParams.set('EdvironCollectRequestId', collectIdObject);
      return res.redirect(callbackUrl.toString());
    } catch (e) {
      console.log(`Error,${e}`);
      throw new Error(`Error in callback,${e.message}`);
    }
  }
}

// const Order_Status_Result = {
//   order_gtw_id: 'HDFC',
//   order_no: '66ac712b2a7a2e27edcdf7ab',
//   order_ship_zip: '',
//   order_ship_address: '',
//   order_bill_email: '',
//   order_notes: '',
//   order_ship_tel: '',
//   order_ship_name: '',
//   order_bill_country: 'India',
//   order_card_name: 'UPI',
//   order_status: 'Successful',
//   order_bill_state: '',
//   order_tax: 0,
//   order_bill_city: '',
//   order_ship_state: '',
//   error_desc: '',
//   order_discount: 0,
//   order_date_time: '2024-08-02 11:09:58.427',
//   order_ship_country: 'India',
//   order_bill_address: '',
//   order_ip: '103.237.173.114',
//   order_option_type: 'OPTUPI',
//   order_bank_ref_no: 104375822658,
//   order_ship_email: '',
//   order_currncy: 'INR',
//   order_fee_flat: 0,
//   order_ship_city: '',
//   order_bill_tel: '',
//   order_device_type: 'PC',
//   order_gross_amt: 1,
//   order_amt: 1,
//   order_bill_zip: '',
//   order_bill_name: '',
//   reference_no: 113401671456,
//   order_bank_response: 'SUCCESS-NA-00',
//   order_status_date_time: '2024-08-02 11:10:21.703',
//   status: 0,
// }
