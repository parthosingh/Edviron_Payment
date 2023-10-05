"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = void 0;
const _jwt = require("jsonwebtoken");
const sign = async (body) => {
    const jwt = _jwt.sign(body, process.env.KEY, { noTimestamp: true });
    console.log({ jwt });
    return { ...body, jwt };
};
exports.sign = sign;
//# sourceMappingURL=sign.js.map