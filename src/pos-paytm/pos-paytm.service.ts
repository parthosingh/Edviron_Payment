import { Injectable } from '@nestjs/common';
import { CollectRequestDocument } from 'src/database/schemas/collect_request.schema';

@Injectable()
export class PosPaytmService {
    constructor(

    ) { }
    async createOrder(collectRequest: CollectRequestDocument) {
        try {


            const requestData = {
                head: {
                    requestTimeStamp: new Date().toISOString(), 
                    channelId: 'RIL',
                    checksum: 'FFFFFFFFFF2345000004', // Replace with actual checksum
                    version: '3.1'
                },
                body: {
                    paytmMid: 'YOUR_MID_HERE', // Replace with your MID
                    paytmTid: '12346490', // Terminal ID assigned by Paytm
                    transactionDateTime: new Date().toISOString(), 
                    merchantTransactionId: '123456343245',
                    merchantReferenceNo: '234564323456',
                    transactionAmount: '9000',
                    merchantExtendedInfo: {
                        PaymentMode: 'All'
                    }
                }
            };

        } catch (error) {

        }
    }

}
