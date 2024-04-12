import * as _jwt from 'jsonwebtoken';
export const sign = async (body: any) => {
  const jwt = _jwt.sign(body, process.env.KEY!, { noTimestamp: true });
  // console.log({jwt});
  return { ...body, jwt };
};
