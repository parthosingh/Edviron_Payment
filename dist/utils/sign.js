"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSignature = exports.decrypt = exports.encryptCard = exports.merchantKeyIv = exports.generateHMACBase64Type = exports.merchantKeySHA256 = exports.calculateSHA256 = exports.calculateSHA512Hash = exports.sign = void 0;
const common_1 = require("@nestjs/common");
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
const merchantKeySHA256 = async (request) => {
    let merchantKey = process.env.EASEBUZZ_KEY;
    let salt = process.env.EASEBUZZ_SALT;
    if (request) {
        try {
            merchantKey =
                request.easebuzz_non_partner_cred?.easebuzz_key || merchantKey;
            salt = request.easebuzz_non_partner_cred?.easebuzz_salt || salt;
        }
        catch (e) {
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
exports.merchantKeySHA256 = merchantKeySHA256;
const generateHMACBase64Type = (signed_payload, secret) => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signed_payload);
    return hmac.digest('base64');
};
exports.generateHMACBase64Type = generateHMACBase64Type;
const merchantKeyIv = (merchant_id, pg_key) => {
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
    }
    catch (e) {
        throw new common_1.BadRequestException(e.message);
    }
};
exports.merchantKeyIv = merchantKeyIv;
const encryptCard = async (data, key, iv) => {
    console.log(`encrypting card info ${data}`);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf-8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
};
exports.encryptCard = encryptCard;
const decrypt = async (encryptedData, key, iv) => {
    console.log({ encryptedData, key, iv });
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
};
exports.decrypt = decrypt;
const generateSignature = (merchID, password, merchTxnID, amount, txnCurrency, txnType, coll_req) => {
    const signatureString = merchID + password + merchTxnID + amount + txnCurrency + txnType;
    const hmac = crypto.createHmac('sha512', coll_req.nttdata_hash_req_key);
    const data = hmac.update(signatureString);
    const gen_hmac = data.digest('hex');
    return gen_hmac;
};
exports.generateSignature = generateSignature;
//# sourceMappingURL=sign.js.map