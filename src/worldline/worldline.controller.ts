import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { DatabaseService } from 'src/database/database.service';
import { WorldlineService } from './worldline.service';
import { PaymentStatus } from 'src/database/schemas/collect_req_status.schema';
import { Gateway } from 'src/database/schemas/collect_request.schema';

@Controller('worldline')
export class WorldlineController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly worldlineService: WorldlineService,
  ) {}

  @Get('redirect')
  async worldlinePayment(@Req() req: any, @Res() res: any) {
    try {
      const { collect_id } = req.query;
      const [request, req_status] = await Promise.all([
        this.databaseService.CollectRequestModel.findById(collect_id),
        this.databaseService.CollectRequestStatusModel.findOne({
          collect_id: new Types.ObjectId(collect_id),
        }),
      ]);
      if (!request || !req_status)
        throw new NotFoundException('Order not found');
      if (!request.worldline.worldline_merchant_id || !request.worldline_token)
        throw new NotFoundException('Order not found');
      const additional_data = JSON.parse(request.additional_data);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      let student_email = additional_data?.student_details?.student_email;
      if (!student_email || !emailRegex.test(student_email)) {
        student_email = 'testemail@email.com';
      }
      const student_phone_no =
        additional_data?.student_details?.student_phone_no || '8888888888';

      const formattedAmount =
        Math.round(parseFloat(request.amount.toString()) * 100) / 100;

      const token = request.worldline_token.toString();
      return res.send(`
        <!doctype html>
        <html>
        <head>
          <title>Checkout Auto-Load</title>
          <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1" />
          <script src="https://www.paynimo.com/paynimocheckout/client/lib/jquery.min.js"></script>
        </head>
        <body>
          <script src="https://www.paynimo.com/paynimocheckout/server/lib/checkout.js"></script>
          <script>
            $(document).ready(function () {
              function handleResponse(res) {
                if (
                  res &&
                  res.paymentMethod &&
                  res.paymentMethod.paymentTransaction &&
                  res.paymentMethod.paymentTransaction.statusCode
                ) {
                  var statusCode = res.paymentMethod.paymentTransaction.statusCode;
                  var statusMessage = res.paymentMethod.paymentTransaction.statusMessage;
        
                  if (statusCode === "0300") {
                    console.log("Payment Success");
                  } else if (statusCode === "0398") {
                    console.log("Payment Initiated");
                  } else {
                    console.error("Payment Error - Status Code:", statusCode);
                    console.error("Payment Error - Message:", statusMessage || "No status message provided.");
                  }
                } else {
                  console.error("Invalid response format:", res);
                }
              }
        
              var reqJson = {
                features: {
                  enableAbortResponse: true,
                  enableExpressPay: true,
                  enableInstrumentDeRegistration: true,
                  enableMerTxnDetails: true
                },
                consumerData: {
                  deviceId: "WEBSH2",
                  token: "${token}",
                  returnUrl: "${process.env.URL}/worldline/callback/?collect_id=${collect_id}",
                  responseHandler: handleResponse,
                  paymentMode: "ALL",
                  merchantId: "${request.worldline.worldline_merchant_id}",
                  currency: "INR",
                  txnId: "${request._id}",
                  items: [{
                    itemId: "first",
                    amount: ${formattedAmount},
                    comAmt: "0"
                  }]
                }
              };
        
              $.pnCheckout(reqJson);
              if (reqJson.features.enableNewWindowFlow) {
                pnCheckoutShared.openNewWindow();
              }
            });
          </script>
        </body>
        </html>
        `);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('/callback')
  async handleCallbackPost(@Req() req: any, @Res() res: any) {
    const { collect_id } = req.query;
    try {
      const saveWebhook = await this.databaseService.WebhooksModel.create({
        gateway: 'wordline',
        body: JSON.stringify(req.body),
      });
    } catch (e) {
      console.log(e);
    }
    console.log(req.body, 'req');

    const msg = req.body.msg;
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectRequest) {
      throw new BadRequestException('Error in collect request');
    }
    const decryptMessage = await this.worldlineService.decryptAES256Hex(
      msg,
      collectRequest.worldline.worldline_encryption_key,
      collectRequest.worldline.worldline_encryption_iV,
    );

    const parsedMessage = JSON.parse(decryptMessage);
    let status =
      parsedMessage?.paymentMethod?.paymentTransaction?.statusMessage || '';
    collectRequest.gateway = Gateway.EDVIRON_WORLDLINE;
    await collectRequest.save();
    let detail = null;
    let paymentMethod = null;
    switch (parsedMessage?.paymentMethod?.paymentMode) {
      case 'UPI':
        detail =
          parsedMessage?.paymentMethod?.paymentTransaction
            ?.upiTransactionDetails;
        paymentMethod = 'UPI';
        break;
      case 'CARD':
        detail = parsedMessage?.paymentMethod?.paymentTransaction?.cardDetails;
        paymentMethod = 'Card';
        break;
      case 'Netbanking':
        detail = {
          netbanking: {
            channel: parsedMessage?.paymentMethod?.instrumentAliasName || null,
            netbanking_bank_code:
              parsedMessage?.paymentMethod?.bankSelectionCode || null,
            netbanking_bank_name:
              parsedMessage?.paymentMethod?.paymentTransaction?.bankName ||
              null,
          },
        };
        paymentMethod = 'netbanking';
        break;
      case 'WALLET':
        detail =
          parsedMessage?.paymentMethod?.paymentTransaction
            ?.walletTransactionDetails;
        paymentMethod = 'Wallet';
        break;
      default:
        detail = null;
        paymentMethod = 'Unknown';
        break;
    }

    const collectStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collect_id,
      });
    if (!collectStatus) {
      throw new BadRequestException('Collect request status not found');
    }
    const paymentTime =
      parsedMessage?.paymentMethod?.paymentTransaction?.dateTime || null;
    collectStatus.payment_method = paymentMethod;
    collectStatus.status =
      status.toUpperCase() === 'SUCCESS'
        ? PaymentStatus.SUCCESS
        : PaymentStatus.PENDING;
    collectStatus.bank_reference =
      parsedMessage?.paymentMethod?.paymentTransaction?.reference || '';
    collectStatus.payment_time = paymentTime
      ? (() => {
          const [datePart, timePart] = paymentTime.split(' ');
          const [day, month, year] = datePart.split('-');
          const [hours, minutes, seconds] = timePart.split(':');
          return new Date(
            Date.UTC(
              Number(year),
              Number(month) - 1,
              Number(day),
              Number(hours),
              Number(minutes),
              Number(seconds),
            ),
          );
        })()
      : new Date();
    collectStatus.details = JSON.stringify(detail);
    await collectStatus.save();
    if (collectRequest.isSplitPayments) {
      console.log('saving vendor');

      try {
        const vendor =
          await this.databaseService.VendorTransactionModel.updateMany(
            {
              collect_id: collectRequest._id,
            },
            {
              $set: {
                payment_time: new Date(
                  parsedMessage?.paymentMethod?.paymentTransaction?.dateTime,
                ),
                status: status.toUpperCase(),
                gateway: Gateway.EDVIRON_WORLDLINE,
              },
            },
          );
      } catch (e) {
        console.log('Error in updating vendor transactions');
      }
    }
    if (collectRequest?.sdkPayment) {
      if (status.toUpperCase() === `SUCCESS`) {
        console.log(`SDK payment success for ${collect_id}`);
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`,
        );
      }
      return res.redirect(
        `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`,
      );
    }
    const callbackUrl = new URL(collectRequest.callbackUrl);
    if (status.toUpperCase() !== `SUCCESS`) {
      return res.redirect(
        `${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
    callbackUrl.searchParams.set('status', 'SUCCESS');
    return res.redirect(callbackUrl.toString());
  }

  @Post('/rest/callback')
  async handleCallbackRest(@Req() req: any, @Res() res: any) {
    const { collect_id } = req.query;
    try {
      const saveWebhook = await this.databaseService.WebhooksModel.create({
        gateway: 'wordline',
        body: JSON.stringify(req.body),
      });
    } catch (e) {
      console.log(e);
    }

    const msg = req.body.msg;
    const collectRequest =
      await this.databaseService.CollectRequestModel.findById(collect_id);
    if (!collectRequest) {
      throw new BadRequestException('Error in collect request');
    }
    const decryptMessage = await this.worldlineService.decryptAES256Hex(
      msg,
      collectRequest.worldline.worldline_encryption_key,
      collectRequest.worldline.worldline_encryption_iV,
    );

    console.log(decryptMessage);

    const parsedMessage = JSON.parse(decryptMessage);
    let status =
      parsedMessage?.paymentMethod?.paymentTransaction?.statusMessage || '';
    collectRequest.gateway = Gateway.EDVIRON_WORLDLINE;
    await collectRequest.save();
    let detail = null;
    let paymentMethod = null;

    switch (parsedMessage?.paymentMethod?.paymentMode) {
      case 'UPI collect':
      detail = {
            upi: {
              channel: null,
              upi_id: 'N/A',
            },
          };
        paymentMethod = 'upi';
        break;
      case 'Credit card':
        paymentMethod = 'credit_card';
        detail = {
          card: {
            card_bank_name:
              parsedMessage?.paymentMethod?.instrumentAliasName || 'NA',
            card_country: 'IN',
            card_network:
              parsedMessage?.paymentMethod?.instrumentAliasName
                ?.instrumentAliasName || 'NA',
            card_number: 'NA',
            card_sub_type: 'P',
            card_type: 'credit_card',
            channel: null,
          },
        };
        break;

      case 'Debit card':
        paymentMethod = 'debit_card';
        detail = {
          card: {
            card_bank_name:
              parsedMessage?.paymentMethod?.instrumentAliasName || 'NA',
            card_country: 'IN',
            card_network:
              parsedMessage?.paymentMethod?.instrumentAliasName
                ?.instrumentAliasName || 'NA',
            card_number: 'NA',
            card_sub_type: 'P',
            card_type: 'debit_card',
            channel: null,
          },
        };
        break;
      case 'Netbanking':
        detail = {
          netbanking: {
            channel: parsedMessage?.paymentMethod?.instrumentAliasName || null,
            netbanking_bank_code:
              parsedMessage?.paymentMethod?.bankSelectionCode || null,
            netbanking_bank_name:
              parsedMessage?.paymentMethod?.paymentTransaction?.bankName ||
              null,
          },
        };
        paymentMethod = 'netbanking';
        break;
      case 'WALLET':
        detail =
          parsedMessage?.paymentMethod?.paymentTransaction
            ?.walletTransactionDetails;
        paymentMethod = 'Wallet';
        break;
      default:
        detail = null;
        paymentMethod = 'Unknown';
        break;
    }

    const collectStatus =
      await this.databaseService.CollectRequestStatusModel.findOne({
        collect_id: collect_id,
      });
    if (!collectStatus) {
      throw new BadRequestException('Collect request status not found');
    }
    const paymentTime =
      parsedMessage?.paymentMethod?.paymentTransaction?.dateTime || null;
    collectStatus.payment_method = paymentMethod;
    collectStatus.status =
      status.toUpperCase() === 'SUCCESS'
        ? PaymentStatus.SUCCESS
        : PaymentStatus.PENDING;
    collectStatus.bank_reference =
      parsedMessage?.paymentMethod?.paymentTransaction?.bankReferenceIdentifier || '';
    collectStatus.payment_time = paymentTime
      ? (() => {
          const [datePart, timePart] = paymentTime.split(' ');
          const [day, month, year] = datePart.split('-');
          const [hours, minutes, seconds] = timePart.split(':');
          return new Date(
            Date.UTC(
              Number(year),
              Number(month) - 1,
              Number(day),
              Number(hours),
              Number(minutes),
              Number(seconds),
            ),
          );
        })()
      : new Date();
    collectStatus.details = JSON.stringify(detail);
    collectStatus.reason = status.toUpperCase();
    collectStatus.payment_message = status.toUpperCase();
    await collectStatus.save();
    if (collectRequest.isSplitPayments) {
      console.log('saving vendor');
      try {
        const vendor =
          await this.databaseService.VendorTransactionModel.updateMany(
            {
              collect_id: collectRequest._id,
            },
            {
              $set: {
                payment_time: new Date(
                  parsedMessage?.paymentMethod?.paymentTransaction?.dateTime,
                ),
                status: status.toUpperCase(),
                gateway: Gateway.EDVIRON_WORLDLINE,
              },
            },
          );
      } catch (e) {
        console.log('Error in updating vendor transactions');
      }
    }
    if (collectRequest?.sdkPayment) {
      if (status.toUpperCase() === `SUCCESS`) {
        console.log(`SDK payment success for ${collect_id}`);
        return res.redirect(
          `${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`,
        );
      }
      return res.redirect(
        `${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`,
      );
    }
    const callbackUrl = new URL(collectRequest.callbackUrl);
    if (status.toUpperCase() !== `SUCCESS`) {
      return res.redirect(
        `${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`,
      );
    }
    callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
    callbackUrl.searchParams.set('status', 'SUCCESS');
    return res.redirect(callbackUrl.toString());
  }

  @Post('/webhook')
  async handleWebhook(@Req() req: any, @Res() res: any) {
    try {
      const stringified_data = JSON.stringify(req.body);
      await this.databaseService.WebhooksModel.create({
        body: stringified_data,
      });
      return res.sendStatus(200);
    } catch (error) {
      throw new BadRequestException(error.message || 'Something went wrong');
    }
  }

  @Post('initiate-refund')
  async initiateRefund(
    @Query("collect_id") collect_id:string,
    @Query ('amount') amount : number
  ) {
    return await this.worldlineService.initiateRefund(collect_id, amount)
  }

}
