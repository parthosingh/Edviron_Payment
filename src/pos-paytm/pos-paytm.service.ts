import { BadRequestException, Injectable, Res } from '@nestjs/common';
import { CollectRequestDocument } from 'src/database/schemas/collect_request.schema';
import * as PaytmChecksum from 'paytmchecksum';
import axios from 'axios';
import { DatabaseService } from 'src/database/database.service';
import { Types } from 'mongoose';
import { data } from 'autoprefixer';



@Injectable()
export class PosPaytmService {
    constructor(
        private readonly databaseService: DatabaseService,
    ) { }


    async initiatePOSPayment(collectRequest: CollectRequestDocument) {
        try {
            const body = {
                paytmMid: collectRequest.pos_machine_device_id, // Replace with MID
                paytmTid: collectRequest.pos_machine_device_code, // Terminal ID assigned by Paytm
                transactionDateTime: new Date().toISOString(),
                merchantTransactionId: collectRequest._id,
                merchantReferenceNo: collectRequest._id,
                transactionAmount: Math.round(collectRequest.amount * 100),
                merchantExtendedInfo: {
                    PaymentMode: 'All'
                }
            }
            const checksum =
                await PaytmChecksum.generateSignature(
                    JSON.stringify(body),
                    process.env.PAYTM_MERCHANT_KEY || "n/a"
                );

            const requestData = {
                head: {
                    requestTimeStamp: new Date().toISOString(),
                    channelId: 'RIL',
                    checksum: checksum,
                    version: '3.1'
                },
                body: body,
            };

            const config = {
                url: `${process.env.PAYTM_POS_BASEURL}/ecr/payment/request`,
                method: 'post',
                maxBodyLength: Infinity,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(requestData)
            }

            const response = await axios.request(config)

            return {
                requestSent: body,
                paytmResponse: response.data,
            };
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    async collectPayment(collectRequest: CollectRequestDocument) {
        try {
            const { requestSent, paytmResponse } = await this.initiatePOSPayment(collectRequest);

            if (paytmResponse.body.resultInfo.resultCodeId !== '0009') {
                throw new BadRequestException({ message: paytmResponse.body.resultMsg });
            }

            const deepLink = `paytmedc://paymentV2?callbackAction=${process.env.URL}/pos-paytm/callback&orderId=${collectRequest._id}&amount=${Math.round(collectRequest.amount * 100)}`;

            return ({
                message: 'Payment request sent. Ask cashier to complete payment on device.',
                deepLink,
                requestDetails: requestSent,
                paytmResponse,
            });
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
                paytmTid: collectRequest.pos_machine_device_code, // Replace with actual terminal ID
                transactionDateTime:
                    collectRequestStatus.payment_time.toISOString().slice(0, 19).replace('T', ' '),
                merchantTransactionId: orderId,
            };
            const checksum = await PaytmChecksum.generateSignature(
                JSON.stringify(body),
                process.env.PAYTM_MERCHANT_KEY || "n/a",
            );
            const requestData = {
                head: {
                    requestTimeStamp: collectRequestStatus.payment_time.toISOString().slice(0, 19).replace('T', ' '),
                    channelId: 'RIL', 
                    checksum:checksum,
                    version: '3.1',
                },
                body : body,
            };

            const config = {
                url : `${process.env.PAYTM_POS_BASEURL}/ecr/V2/payment/status`,
                method:'post',
                headers : { 'Content-Type': 'application/json' },
                data : JSON.stringify(requestData)
            }
            const response = await axios.request(config)

            return response.data;
        } catch (error) {
            console.error('Error fetching transaction status:', error);
            throw new BadRequestException('Failed to fetch transaction status.');
        }
    }



}
