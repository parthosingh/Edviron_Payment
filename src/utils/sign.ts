import { BadRequestException } from '@nestjs/common';
import * as _jwt from 'jsonwebtoken';
import { CollectRequest } from 'src/database/schemas/collect_request.schema';
const crypto = require('crypto');

export const sign = async (body: any) => {
  const jwt = _jwt.sign(body, process.env.KEY!, { noTimestamp: true });
  // console.log({jwt});
  return { ...body, jwt };
};

export const calculateSHA512Hash = async (data: any) => {
  const hash = crypto.createHash('sha512');
  hash.update(data);
  return hash.digest('hex');
};

export const calculateSHA256 = async (data: any) => {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
};

export const merchantKeySHA256 = async (request?: CollectRequest) => {
  let merchantKey = process.env.EASEBUZZ_KEY;
  let salt = process.env.EASEBUZZ_SALT;
  if (request) {
    try {
      merchantKey =
        request.easebuzz_non_partner_cred?.easebuzz_key || merchantKey;
      salt = request.easebuzz_non_partner_cred?.easebuzz_salt || salt;
    } catch (e) {
      merchantKey = process.env.EASEBUZZ_KEY;
      salt = process.env.EASEBUZZ_SALT;
    }
  }
  const key = crypto
    .createHash('sha256')
    .update(merchantKey)
    .digest()
    .toString('hex')
    .slice(0, 32);
  const iv = crypto
    .createHash('sha256')
    .update(salt)
    .digest()
    .toString('hex')
    .slice(0, 16);
  return {
    key,
    iv,
  };
};

export const generateHMACBase64Type = (
  signed_payload: string,
  secret: string,
) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signed_payload);
  return hmac.digest('base64');
};

export const merchantKeyIv = (
  merchant_id: string,
  pg_key: string
) => {
  try {
    let merchantKey = merchant_id;
    let salt = pg_key;

    const key = crypto
      .createHash('sha256')
      .update(merchantKey)
      .digest()
      .toString('hex')
      .slice(0, 32);
    const iv = crypto
      .createHash('sha256')
      .update(salt)
      .digest()
      .toString('hex')
      .slice(0, 16);
    return {
      key,
      iv,
    };

  } catch (e) {
    throw new BadRequestException(e.message)
  }
}

// export const encryptCard=async(data:string,key:string,iv:string)=>{
//   console.log({data,key,iv});

//   const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
//   console.log('cyber cipher generated: ', cipher);

//   let encrypted = cipher.update(data, 'utf8', 'base64')
//   console.log('encryption done');

//   encrypted += cipher.final('base64')
//   return encrypted
// }

export const encryptCard = async (data: string, key: string, iv: string) => {
  console.log(`encrypting card info ${data}`);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf-8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
};

export const decrypt = async (
  encryptedData: string,
  key: string,
  iv: string,
) => {
  console.log({encryptedData,key,iv});
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
};

export const generateSignature = (
  merchID: string,
  password: string,
  merchTxnID: string,
  amount: string,
  txnCurrency: string,
  txnType: string,
  coll_req: any,
) => {
  // const resHashKey = process.env.NTT_REQUEST_HASH_KEY!;
  const signatureString =
    merchID + password + merchTxnID + amount + txnCurrency + txnType;
  const hmac = crypto.createHmac('sha512', coll_req.nttdata_hash_req_key);
  const data = hmac.update(signatureString);
  const gen_hmac = data.digest('hex');
  return gen_hmac;
};
