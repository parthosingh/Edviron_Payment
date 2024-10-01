import * as _jwt from 'jsonwebtoken';
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

export const merchantKeySHA256 = async () => {
  // const merchantKey = process.env.EASEBUZZ_KEY;
   const merchantKey = "S128810WGAA"
  const key = crypto
    .createHash('sha256')
    .update(merchantKey)
    .digest()
    .toString('hex')
    .slice(0, 32);
  const salt = process.env.EASEBUZZ_SALT;
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

export const decrypt=async(encryptedData:string, key:string, iv:string)=> {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}