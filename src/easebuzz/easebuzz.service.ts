import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
import { calculateSHA512Hash } from 'src/utils/sign';

@Injectable()
export class EasebuzzService {
  constructor(private readonly databaseService: DatabaseService) {}

  async easebuzzCheckStatus(
    collect_request_id: String,
    collect_request: CollectRequest,
  ) {
    const amount = parseFloat(collect_request.amount.toString()).toFixed(1);

    const axios = require('axios');
    let hashData =
      process.env.EASEBUZZ_KEY +
      '|' +
      collect_request_id +
      '|' +
      amount.toString() +
      '|' +
      'noreply@edviron.com' +
      '|' +
      '9898989898' +
      '|' +
      process.env.EASEBUZZ_SALT;

    let hash = await calculateSHA512Hash(hashData);
    const qs = require('qs');

    const data = qs.stringify({
      txnid: collect_request_id,
      key: process.env.EASEBUZZ_KEY,
      amount: amount,
      email: 'noreply@edviron.com',
      phone: '9898989898',
      hash: hash,
    });

    const config = {
      method: 'POST',
      url: `https://dashboard.easebuzz.in/transaction/v1/retrieve`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: data,
    };

    const { data: statusRes } = await axios.request(config);
    console.log(statusRes);
    return statusRes;
  }

  async statusResponse(requestId: string, collectReq: CollectRequest) {
    let statusResponse = await this.easebuzzCheckStatus(requestId,collectReq);
    if (statusResponse.msg.mode === 'NA') {
      console.log(`Status 0 for ${requestId}, retrying with 'upi_' suffix`);
      statusResponse = await this.easebuzzCheckStatus(`upi_${requestId}`,collectReq);
    }

    return statusResponse;
  }
}
