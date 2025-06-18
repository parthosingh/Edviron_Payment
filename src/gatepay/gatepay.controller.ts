import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { DatabaseService } from '../database/database.service';
import { GatepayService } from './gatepay.service';
import { Gateway } from 'src/database/schemas/collect_request.schema';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';

@Controller('gatepay')
export class GatepayController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly gatepayService: GatepayService,
  ) {}
  @Post('callback')
  async handleCallback(@Req() req: any, @Res() res: any) {
    try {
      const { collect_id } = req.query;
      const { status, message, response, terminalId } = req.body;

      const [collect_request, collect_req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);

      if (!collect_request || !collect_req_status) {
        throw new BadRequestException('Request not found');
      }
      const { gatepay_key, gatepay_iv } = collect_request.gatepay;

      const decrypted = await this.gatepayService.decryptEas(
        response,
        gatepay_key,
        gatepay_iv,
      );

      const parseData = JSON.parse(JSON.parse(decrypted));
      console.log('Decrypted Response:', JSON.stringify(parseData, null, 2));

      const { paymentMode, txnStatus, txnAmount, txnDate, getepayTxnId } =
        parseData;

      try {
        await this.databaseService.WebhooksModel.create({
          body: JSON.stringify(parseData),
          gateway: 'gatepay_callback',
        });
      } catch (error) {
        console.error('Webhook save failed:', error.message);
      }

      let paymentMethod = '';
      switch (paymentMode) {
        case 'DC':
          paymentMethod = 'debitCard';
          break;
        case 'CC':
          paymentMethod = 'creditCard';
          break;
        case 'NB':
          paymentMethod = 'netBanking';
          break;
        case 'UPI':
          paymentMethod = 'upi';
          break;
      }
      const formattedDate = txnDate?.replace(' ', 'T');
      const dateObj = formattedDate ? new Date(formattedDate) : null;

      if (!dateObj || isNaN(dateObj.getTime())) {
        throw new BadRequestException('Invalid txnDate received');
      }

      collect_req_status.status =
        txnStatus === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.PENDING;
      collect_req_status.transaction_amount = txnAmount || '';
      collect_req_status.payment_time = dateObj || Date.now();
      collect_req_status.payment_method = paymentMethod || '';
      collect_req_status.payment_message = message || '';
      await collect_req_status.save();

      const payment_status = collect_req_status.status;
      if (collect_request.sdkPayment) {
        const redirectBase = process.env.PG_FRONTEND;
        const route =
          payment_status === PaymentStatus.SUCCESS
            ? 'payment-success'
            : 'payment-failure';
        return res.redirect(
          `${redirectBase}/${route}?collect_id=${collect_id}`,
        );
      }

      const callbackUrl = new URL(collect_request.callbackUrl);
      callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);

      if (payment_status !== PaymentStatus.SUCCESS) {
        callbackUrl.searchParams.set('status', 'FAILED');
        callbackUrl.searchParams.set('reason', 'Payment-failed');
        return res.redirect(callbackUrl.toString());
      }

      callbackUrl.searchParams.set('status', 'SUCCESS');
      return res.redirect(callbackUrl.toString());
    } catch (error) {
      console.error('Callback Error:', error);
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }
}

// status: 'SUCCESS',
//   message: 'Transaction is processed successfuly',
//   mid: '108',
//   response: '5BDAAD0A7A2C711FD4A8431395563C18D07BBEA0C23153B9775B937343A1B05231F5B1ADEF295158D6C0A78E41A0CBA85AEEF0FC0306173DE7D7F8FC25DC8FCEB1E4D5EB5A9CBE81AC8320B7EA696313AD98C8D87253D5522E0BBAFA64A972EBC9C535C687AE328CD5133CCF8DE1AD5C814A844735B2C577149ABC7DA022AA9BF5A2A1F68EFA0D82524D951F607374DCFF0E51431B0E039CA51EC7859845B95B0EFEDD867DDFFB031D3EE0573036D57DB079F98FC3DD86DABC541F742D580594F0CBD0059537E5AE5504BD6F2BB6E4E384E120BA12F91BB14C937103658E3C10790B8A3BCFFAA24369FED7709FFA77C95AF041979758BDFDC5323F07BD15DFA1F850DDFDD91D2F0102EAA0C6FF6B7A6F0C3F4F2B84D368A08BF8E94534B8A2D2618E6D22EB91BF1364201C6BC930BE886DFC25A670A74F227541096915B6A967CC97E551AC33E33699ACEEF011E1FC649168E65C0DE4B2C33867B5F21299FC702A645827028AF0DF4A02F789D64BC905A7791214D8B83CCEC99457588C5EE6D80760019C90FB0EAAF60CC9DE4CAE93E4B50A853273145737E298BE4A11360B490FF58AC3CE86F33268A027A849B64992805C70AE126F747110BE998D959D5CB1323C404D6BA5A1CE68D2E3324829DF6B4B5AC46F3953C271338974BA935E02EF2C0CD1A9CEE2399E0BEE461E17EA48C01E5267DFC57B9FB9A2D6F70B862FEAE6591CD669ABD738559E901E7C9E05DEC2171CE50E345803E30B31646D4FCCF8CA9EA8F61223CC416756A7E7FD91570E266982E4A638D368B2DA42E2578E0B1D546F81C51B43BCBA973B7CAF789E56E5A183CEA3F6469BDCF55CCF1AF4C0F8176EE6E3CCA04979AF2BCE590A1F7314406451534F988C5DC7E41768C179B5D3CAB64A652FFB544C9AFEE11A460691C5E0C02C2B90447243C00F7478839004BAED63A17A34D53DC41183D5AAECAAB66924D672919C7388B83F7B43DEE0DD363E66C0446C6129A96A8A4D292704973B833590BF51CE839097B600B93FFBEE44BC48D49AB1EDE3153E41B79F12B7C5DB67F211D62E313A190687BD615ED25634B76186928D340DA932CAD7BF60824F6AF139D3272303232986C3721B53C2B05A91ED02D02C2508D33FB137BC05F49F573421AA',
//   terminalId: 'Getepay.merchant61062@icici'

// const data = {
//   getepayTxnId: '19181478',
//   mid: '108',
//   txnAmount: '1.0',
//   txnStatus: 'SUCCESS',
//   merchantOrderNo: '6851bac31dc057bf6a6eece4',
//   udf1: '7000000000',
//   udf2: 'mailto:manishv7053@gmail.com',
//   udf3: 'Gatepay Dev',
//   udf4: '',
//   udf5: '',
//   udf6: '',
//   udf7: '',
//   udf8: '',
//   udf9: '',
//   udf10: '',
//   udf41:
//     'http://localhost:4001/gatepay/callback?collect_id\u003d6851bac31dc057bf6a6eece4',
//   custRefNo: '',
//   paymentMode: 'DC',
//   discriminator: 'L21lZGlhL3NoYXJlZC9keW5hbWljcXJwYXRoL0dFVGdwZHIzMjI1NDIucG5n',
//   message: '',
//   paymentStatus: 'SUCCESS',
//   txnDate: '2025-06-18 00:28:38',
//   surcharge: '',
//   totalAmount: '1.00',
//   settlementAmount: '',
//   settlementRefNo: '',
//   settlementDate: '',
//   settlementStatus: '',
//   txnNote: 'Test Txn',
// };
