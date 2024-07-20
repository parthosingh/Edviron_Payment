"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSHA512Hash = exports.sign = void 0;
const _jwt = require("jsonwebtoken");
const crypto = require('crypto');
const sign = async (body) => {
    const jwt = _jwt.sign(body, process.env.KEY, { noTimestamp: true });
    return { ...body, jwt };
};
exports.sign = sign;
const calculateSHA512Hash = async (data) => {
    const hash = crypto.createHash('sha512');
    hash.update(data);
    return hash.digest('hex');
};
exports.calculateSHA512Hash = calculateSHA512Hash;
//# sourceMappingURL=sign.js.map