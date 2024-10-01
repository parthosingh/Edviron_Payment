"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encryptCard = exports.merchantKeySHA256 = exports.calculateSHA256 = exports.calculateSHA512Hash = exports.sign = void 0;
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
const calculateSHA256 = async (data) => {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
};
exports.calculateSHA256 = calculateSHA256;
const merchantKeySHA256 = async () => {
    const merchantKey = process.env.EASEBUZZ_KEY;
    const salt = process.env.EASEBUZZ_SALT;
    console.log({ merchantKey, salt });
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
exports.merchantKeySHA256 = merchantKeySHA256;
const encryptCard = async (data, key, iv) => {
    console.log(`encrypting card info ${data}`);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf-8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
};
exports.encryptCard = encryptCard;
const decrypt = async (encryptedData, key, iv) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
};
exports.decrypt = decrypt;
//# sourceMappingURL=sign.js.map