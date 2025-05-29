import { BadRequestException, Injectable, Res } from '@nestjs/common';
import { CollectRequestDocument } from 'src/database/schemas/collect_request.schema';
// import * as PaytmChecksum from 'paytmchecksum';
const Paytm = require('paytmchecksum');
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import { Types } from 'mongoose';
import { data } from 'autoprefixer';



@Injectable()
export class PosPaytmService {
    constructor(
        private readonly databaseService: DatabaseService,
    ) { }

    async nowInIST(): Promise<Date> {
        return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    }

    async fmt(d: Date): Promise<string> {
        return d
            .toISOString()
            .replace(/T/, ' ')
            .replace(/\..+/, '');
    }
    // async initiatePOSPayment(collectRequest: CollectRequestDocument) {
    async initiatePOSPayment() {
        try {
            const body = {
                paytmMid: "yYLgEx27583498804201",
                paytmTid: "70001853",
                transactionDateTime: await this.fmt(await this.nowInIST()),
                merchantTransactionId: "682eb334bb160d8d987bb36f",
                merchantReferenceNo: "682eb334bb160d8d987bb36f",
                transactionAmount: String(Math.round(1 * 100)),
                callbackUrl : `https://www.google.com/`,
            };


            var checksum =
                await Paytm.generateSignature(body, "urflK0@0mthEgRo8");
            var isVerifySignature =
                await Paytm.verifySignature(body, "urflK0@0mthEgRo8", checksum);
            if (!isVerifySignature) {
                throw new BadRequestException('Checksum verification failed');
            }
            const requestData = {
                head: {
                    requestTimeStamp: await this.fmt(await this.nowInIST()),
                    channelId: 'EDC',
                    checksum: checksum,
                },
                body: body,
            };

            const config = {
                url: `${process.env.PAYTM_POS_BASEURL}/ecr/payment/request`,
                // url: `https://securestage.paytmpayments.com/theia/api/v1/initiateTransaction?mid=yYLgEx27583498804201&orderId=ORDERID_98765555`,
                method: 'post',
                maxBodyLength: Infinity,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(requestData)
            }

            const response = await axios.request(config)

            // console.log('Paytm POS Payment Request:', response);
            console.log('Paytm POS Payment Response:', response.data);

            return {
                requestSent: requestData,
                paytmResponse: response.data,
            };
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    async collectPayment() {
        try {
            // const { requestSent, paytmResponse } = await this.initiatePOSPayment(collectRequest);
            return await this.initiatePOSPayment();

            // if (paytmResponse.body.resultInfo.resultCodeId !== '0009') {
            //     throw new BadRequestException({ message: paytmResponse.body.resultMsg });
            // }

            // const deepLink = `paytmedc://paymentV2?callbackAction=${process.env.URL}/pos-paytm/callback&orderId=${2091293484338398383}&amount=${Math.round(1 * 100)}`;

            // return ({
            //     message: 'Payment request sent. Ask cashier to complete payment on device.',
            //     deepLink,
            //     requestDetails: requestSent,
            //     paytmResponse,
            // });
        } catch (error) {
            console.error(error);
            throw new BadRequestException({ message: 'Payment request error', error: error.message });
        }
    }

    async getTransactionStatus(orderId: string) {
        try {
            const collectRequest =
                await this.databaseService.CollectRequestModel.findById(orderId)
            if (!collectRequest) {
                throw new BadRequestException('collect request not found')
            }
            const collectRequestStatus =
                await this.databaseService.CollectRequestStatusModel.findOne({ collect_id: new Types.ObjectId(orderId) })
            if (!collectRequestStatus) {
                throw new BadRequestException('collect request status not found')
            }
            const body = {
                paytmMid: collectRequest.pos_machine_device_id,
                paytmTid: collectRequest.pos_machine_device_code, 
                transactionDateTime:
                    collectRequestStatus.payment_time.toISOString().slice(0, 19).replace('T', ' '),
                merchantTransactionId: orderId,
            };
            const checksum = await Paytm.generateSignature(
                JSON.stringify(body),
                process.env.PAYTM_MERCHANT_KEY || "n/a",
            );
            const requestData = {
                head: {
                    requestTimeStamp: collectRequestStatus.payment_time.toISOString().slice(0, 19).replace('T', ' '),
                    channelId: 'RIL',
                    checksum: checksum,
                    version: '3.1',
                },
                body: body,
            };

            const config = {
                url: `${process.env.PAYTM_POS_BASEURL}/ecr/V2/payment/status`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(requestData)
            }
            const response = await axios.request(config)

            return response.data;
        } catch (error) {
            console.error('Error fetching transaction status:', error);
            throw new BadRequestException('Failed to fetch transaction status.');
        }
    }



}
