"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NttdataService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const crypto = require("crypto");
const axios_1 = require("axios");
const sign_1 = require("../utils/sign");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const mongoose_1 = require("mongoose");
let NttdataService = class NttdataService {
    constructor(databaseService) {
        this.databaseService = databaseService;
        this.ENC_KEY = process.env.NTT_ENCRYPTION_KEY || '';
        this.REQ_SALT = process.env.NTT_ENCRYPTION_KEY || '';
        this.IV = Buffer.from([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        ]);
        this.ALGORITHM = 'aes-256-cbc';
        this.PASSWORD = Buffer.from(this.ENC_KEY, 'utf8');
        this.SALT = Buffer.from(this.REQ_SALT, 'utf8');
    }
    encrypt(text) {
        const derivedKey = crypto.pbkdf2Sync(this.PASSWORD, this.SALT, 65536, 32, 'sha512');
        const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, this.IV);
        let encrypted = cipher.update(text, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted.toString('hex');
    }
    decrypt(text) {
        const respassword = Buffer.from('75AEF0FA1B94B3C10D4F5B268F757F11', 'utf8');
        const ressalt = Buffer.from('75AEF0FA1B94B3C10D4F5B268F757F11', 'utf8');
        const derivedKey = crypto.pbkdf2Sync(respassword, ressalt, 65536, 32, 'sha512');
        const encryptedText = Buffer.from(text, 'hex');
        const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, this.IV);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
    async createOrder(request) {
        const { _id, amount, additional_data, ntt_data } = request;
        const txnDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const formattedAmount = Math.round(parseFloat(amount.toString()) * 100) / 100;
        const parsedData = JSON.parse(additional_data);
        const studentEmail = parsedData?.student_details?.student_email || 'testemail@email.com';
        const studentPhone = parsedData?.student_details?.student_phone_no || '8888888888';
        const payload = {
            payInstrument: {
                headDetails: {
                    version: 'OTSv1.1',
                    api: 'AUTH',
                    platform: 'FLASH',
                },
                merchDetails: {
                    merchId: ntt_data.nttdata_id,
                    userId: '',
                    password: ntt_data.nttdata_secret,
                    merchTxnId: _id.toString(),
                    merchTxnDate: txnDate,
                },
                payDetails: {
                    amount: formattedAmount,
                    product: 'AIPAY',
                    txnCurrency: 'INR',
                },
                custDetails: {
                    custEmail: studentEmail,
                    custMobile: studentPhone,
                },
                extras: {
                    udf1: 'udf1',
                    udf2: 'udf2',
                    udf3: 'udf3',
                    udf4: 'udf4',
                    udf5: 'udf5',
                },
            },
        };
        try {
            const encData = this.encrypt(JSON.stringify(payload));
            const form = new URLSearchParams({
                encData,
                merchId: ntt_data.nttdata_id,
            });
            const config = {
                method: 'post',
                url: `${process.env.NTT_AUTH_API_URL}/ots/aipay/auth`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                data: form.toString(),
            };
            const { data } = await axios_1.default.request(config);
            const encResponse = data?.split('&')?.[1]?.split('=')?.[1];
            if (!encResponse) {
                throw new Error('Encrypted token not found in NTT response');
            }
            const { atomTokenId } = JSON.parse(this.decrypt(encResponse));
            const updatedRequest = await this.databaseService.CollectRequestModel.findOneAndUpdate({ _id }, { $set: { 'ntt_data.ntt_atom_token': atomTokenId } }, { new: true });
            if (!updatedRequest)
                throw new common_1.BadRequestException('Orders not found');
            const url = `${process.env.URL}/nttdata/redirect?collect_id=${_id.toString()}`;
            return { url, collect_req: updatedRequest };
        }
        catch (error) {
            throw new common_1.BadRequestException(error?.message || 'Something went wrong');
        }
    }
    async getTransactionStatus(collect_id) {
        try {
            const coll_req = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!coll_req)
                throw new common_1.BadRequestException('Orders not found');
            const ntt_secret = coll_req.ntt_data.nttdata_secret;
            const txnId = coll_req._id.toString();
            const formattedAmount = Math.round(parseFloat(coll_req.amount.toString()) * 100) / 100;
            const hashData = `${ntt_secret}${txnId}${formattedAmount}INR`;
            const hashValue = await (0, sign_1.calculateSHA512Hash)(hashData);
            const payload = {
                payInstrument: {
                    payDetails: {
                        amount: formattedAmount,
                        signature: hashValue,
                        txnCurrency: 'INR',
                    },
                    merchDetails: {
                        merchId: coll_req.ntt_data.nttdata_id,
                        merchTxnId: coll_req._id.toString(),
                        merchTxnDate: coll_req.createdAt,
                    },
                },
            };
            const config = {
                method: 'post',
                url: `${process.env.NTT_AUTH_API_URL}/ots/v2/payment/status`,
                headers: {
                    'cache-control': 'no-cache',
                    'Content-Type': 'application/json',
                },
                data: payload,
            };
            const { data: paymentStatusRes } = await axios_1.default.request(config);
            return paymentStatusRes;
        }
        catch (error) {
            throw new Error('Failed to fetch transaction status');
        }
    }
    async terminateOrder(collect_id) {
        try {
            const [request, req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!request || !req_status) {
                throw new common_1.BadRequestException('Order not found');
            }
            if (req_status.status === collect_req_status_schema_1.PaymentStatus.PENDING) {
                req_status.status = collect_req_status_schema_1.PaymentStatus.USER_DROPPED;
                await req_status.save();
                return true;
            }
            return req_status.status !== collect_req_status_schema_1.PaymentStatus.SUCCESS;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to terminate order');
        }
    }
};
exports.NttdataService = NttdataService;
exports.NttdataService = NttdataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], NttdataService);
//# sourceMappingURL=nttdata.service.js.map