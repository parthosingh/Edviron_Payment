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