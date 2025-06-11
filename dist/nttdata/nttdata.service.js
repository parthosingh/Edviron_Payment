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
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const sign_1 = require("../utils/sign");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const mongoose_1 = require("mongoose");
let NttdataService = class NttdataService {
    constructor(databaseService) {
        this.databaseService = databaseService;
        this.IV = Buffer.from([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        ]);
    }
    encrypt(text, ENC_KEY, REQ_SALT) {
        const derivedKey = crypto.pbkdf2Sync(Buffer.from(ENC_KEY, 'utf8'), Buffer.from(REQ_SALT, 'utf8'), 65536, 32, 'sha512');
        const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, this.IV);
        let encrypted = cipher.update(text, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted.toString('hex');
    }
    decrypt(text, RES_ENC_KEY, RES_SALT) {
        const respassword = Buffer.from(RES_ENC_KEY, 'utf8');
        const ressalt = Buffer.from(RES_SALT, 'utf8');
        const derivedKey = crypto.pbkdf2Sync(respassword, ressalt, 65536, 32, 'sha512');
        const encryptedText = Buffer.from(text, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, this.IV);
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
                    product: 'SCHOOL',
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
            const encData = this.encrypt(JSON.stringify(payload), ntt_data.nttdata_req_salt, ntt_data.nttdata_req_salt);
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
            console.log(data);
            const encResponse = data?.split('&')?.[1]?.split('=')?.[1];
            if (!encResponse) {
                throw new Error('Encrypted token not found in NTT response');
            }
            const { atomTokenId } = JSON.parse(this.decrypt(encResponse, ntt_data.nttdata_res_salt, ntt_data.nttdata_res_salt));
            const updatedRequest = await this.databaseService.CollectRequestModel.findOneAndUpdate({ _id }, {
                $set: {
                    'ntt_data.ntt_atom_token': atomTokenId,
                    'ntt_data.ntt_atom_txn_id': _id.toString(),
                    gateway: collect_request_schema_1.Gateway.EDVIRON_NTTDATA,
                },
            }, { new: true });
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
            const [coll_req, collec_req_status] = await Promise.all([
                this.databaseService.CollectRequestModel.findById(collect_id),
                this.databaseService.CollectRequestStatusModel.findOne({
                    collect_id: new mongoose_1.Types.ObjectId(collect_id),
                }),
            ]);
            if (!coll_req)
                throw new common_1.BadRequestException('Orders not found');
            if (!collec_req_status) {
                throw new common_1.BadRequestException('Error in getting status');
            }
            const ntt_merchant_id = coll_req.ntt_data.nttdata_id;
            const txnId = coll_req._id.toString();
            const formattedAmount = Math.round(parseFloat(coll_req.amount.toString()) * 100) / 100;
            const sign = (0, sign_1.generateSignature)(coll_req.ntt_data.nttdata_id, coll_req.ntt_data.nttdata_secret, coll_req._id.toString(), formattedAmount.toFixed(2), 'INR', 'TXNVERIFICATION', coll_req.ntt_data);
            const payload = {
                payInstrument: {
                    headDetails: {
                        api: 'TXNVERIFICATION',
                        source: 'OTS',
                    },
                    merchDetails: {
                        merchId: ntt_merchant_id,
                        password: coll_req.ntt_data.nttdata_secret,
                        merchTxnId: txnId,
                        merchTxnDate: coll_req.createdAt?.toISOString().split('T')[0],
                    },
                    payDetails: {
                        atomTxnId: coll_req.ntt_data.ntt_atom_txn_id,
                        amount: formattedAmount.toFixed(2),
                        txnCurrency: 'INR',
                        signature: sign,
                    },
                },
            };
            const encData = this.encrypt(JSON.stringify(payload), coll_req.ntt_data.nttdata_req_salt, coll_req.ntt_data.nttdata_req_salt);
            const form = new URLSearchParams({
                merchId: coll_req.ntt_data.nttdata_id,
                encData,
            });
            const config = {
                method: 'post',
                url: `${process.env.NTT_AUTH_API_URL}/ots/payment/status?${form.toString()}`,
                headers: {
                    'cache-control': 'no-cache',
                    'Content-Type': 'application/json',
                },
            };
            const { data: paymentStatusRes } = await axios_1.default.request(config);
            const encResponse = paymentStatusRes?.split('&')?.[0]?.split('=')?.[1];
            if (!encResponse) {
                throw new Error('Encrypted token not found in NTT response');
            }
            const res = await JSON.parse(this.decrypt(encResponse, coll_req.ntt_data.nttdata_res_salt, coll_req.ntt_data.nttdata_res_salt));
            const { payInstrument } = res;
            const responseData = payInstrument[payInstrument.length - 1];
            const { payDetails, payModeSpecificData, responseDetails } = responseData;
            let status_code = 400;
            if (responseDetails.message == 'SUCCESS') {
                status_code = 200;
            }
            const formattedResponse = {
                status: responseDetails.message,
                amount: coll_req?.amount,
                status_code,
                details: JSON.stringify(payModeSpecificData),
                custom_order_id: coll_req.custom_order_id || null,
            };
            return formattedResponse;
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
                req_status.payment_message = 'Session Expired';
                await req_status.save();
                return true;
            }
            return req_status.status !== collect_req_status_schema_1.PaymentStatus.SUCCESS;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to terminate order');
        }
    }
    async generateSignature(signature, secretKey) {
        const data = signature;
        const hmac = crypto.createHmac('sha512', secretKey);
        hmac.update(data);
        return hmac.digest('hex');
    }
    async initiateRefund(collect_request_id, amount) {
        try {
            const collect_request = await this.databaseService.CollectRequestModel.findById(collect_request_id);
            if (!collect_request) {
                throw new common_1.BadRequestException('Order not found');
            }
            if (amount > collect_request.amount) {
                throw new common_1.BadRequestException("Refund amount can't be greater than order amount");
            }
            const signaturevalue = collect_request.ntt_data.nttdata_id +
                collect_request.ntt_data.nttdata_secret +
                collect_request_id +
                amount +
                'INR' +
                'REFUNDINIT';
            const signature = await this.generateSignature(signaturevalue, collect_request.ntt_data.nttdata_hash_req_key);
            const payload = {
                payInstrument: {
                    headDetails: {
                        api: 'REFUNDINIT',
                        source: 'OTS',
                    },
                    merchDetails: {
                        merchId: collect_request.ntt_data.nttdata_id,
                        password: collect_request.ntt_data.nttdata_secret,
                        merchTxnId: collect_request_id,
                    },
                    payDetails: {
                        atomTxnId: collect_request.ntt_data.ntt_atom_token,
                        signature: signature,
                        prodDetails: [
                            {
                                prodName: 'SCHOOL',
                                prodRefundId: 'refund1',
                                prodRefundAmount: amount,
                            },
                        ],
                        txnCurrency: 'INR',
                        totalRefundAmount: amount,
                    },
                },
            };
            const encData = this.encrypt(JSON.stringify(payload), collect_request.ntt_data.nttdata_req_salt, collect_request.ntt_data.nttdata_req_salt);
            const form = new URLSearchParams({
                merchId: collect_request.ntt_data.nttdata_id,
                encData,
            });
            const config = {
                method: 'post',
                url: `https://payment.atomtech.in/ots/payment/refund?${form.toString()}`,
                headers: {
                    'cache-control': 'no-cache',
                    'Content-Type': 'application/json',
                },
            };
            const { data: paymentStatusRes } = await axios_1.default.request(config);
            const encResponse = paymentStatusRes?.split('&')?.[0]?.split('=')?.[1];
            if (!encResponse) {
                throw new Error('Encrypted token not found in NTT response');
            }
            const res = await JSON.parse(this.decrypt(encResponse, collect_request.ntt_data.nttdata_res_salt, collect_request.ntt_data.nttdata_res_salt));
            try {
                await this.databaseService.WebhooksModel.create({
                    body: JSON.stringify(res),
                    gateway: 'ntt_refund',
                });
            }
            catch (error) {
                throw new common_1.BadRequestException(error.message);
            }
            return res;
        }
        catch (error) {
            throw new common_1.BadRequestException(error?.message || 'Something went wrong');
        }
    }
};
exports.NttdataService = NttdataService;
exports.NttdataService = NttdataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], NttdataService);
const y = {
    payInstrument: {
        merchDetails: {
            merchId: 706008,
            merchTxnId: '68491ff04aaab7058c6a68a8',
            merchTxnDate: '2025-06-11T11:49:52',
        },
        payDetails: {
            atomTxnId: 11000281049693,
            prodDetails: [{ prodName: 'SCHOOL', prodAmount: 1 }],
            amount: 1,
            surchargeAmount: 3.54,
            totalAmount: 4.54,
            custAccNo: '123456789012',
            clientCode: '1234',
            txnCurrency: 'INR',
            signature: 'eca9dd326ef178fca01233ccb17b12a865b2c3c26732170417aa22dba05a3ab9d8e30590bb160740c7ce0777f2ae0b532e8a4c15218dd7281031c7355d5b391a',
            txnInitDate: '2025-06-11 11:49:52',
            txnCompleteDate: '2025-06-11 11:50:03',
        },
        payModeSpecificData: {
            subChannel: ['BQ'],
            bankDetails: {
                otsBankId: 3,
                bankTxnId: '552807062865',
                authId: '552807062865',
                otsBankName: 'ICICI Bank',
                scheme: 'upi',
            },
        },
        extras: {
            udf1: 'udf1',
            udf2: 'udf2',
            udf3: 'udf3',
            udf4: 'udf4',
            udf5: 'udf5',
        },
        custDetails: {
            custEmail: 'testing@edviron.com',
            custMobile: '8888888888',
            billingInfo: {},
        },
        responseDetails: {
            statusCode: 'OTS0000',
            message: 'SUCCESS',
            description: 'TRANSACTION IS SUCCESS',
        },
    },
};
const u = {
    payInstrument: {
        merchDetails: {
            merchId: 706008,
            merchTxnId: '684920b2fe60d9996d98283f',
            merchTxnDate: '2025-06-11T11:52:57',
        },
        payDetails: {
            atomTxnId: 11000281049911,
            prodDetails: [{ prodName: 'SCHOOL', prodAmount: 1 }],
            amount: 1,
            surchargeAmount: 3.54,
            totalAmount: 4.54,
            custAccNo: '123456789012',
            clientCode: '1234',
            txnCurrency: 'INR',
            signature: 'bfe3e9d38fa124d11b86cb02f6aa93b87e1901c69f1f955ce40bfe5cd4c008e4853ae69949fc135685d510f1f5afeb691e3f79ef63a4b290b67c9dac1e8da27e',
            txnInitDate: '2025-06-11 11:52:57',
            txnCompleteDate: '2025-06-11 11:53:06',
        },
        payModeSpecificData: {
            subChannel: ['BQ'],
            bankDetails: {
                otsBankId: 3,
                bankTxnId: '552821067140',
                authId: '552821067140',
                otsBankName: 'ICICI Bank',
                scheme: 'upi',
            },
        },
        extras: {
            udf1: 'udf1',
            udf2: 'udf2',
            udf3: 'udf3',
            udf4: 'udf4',
            udf5: 'udf5',
        },
        custDetails: {
            custEmail: 'testing@edviron.com',
            custMobile: '8888888888',
            billingInfo: {},
        },
        responseDetails: {
            statusCode: 'OTS0000',
            message: 'SUCCESS',
            description: 'TRANSACTION IS SUCCESS',
        },
    },
};
//# sourceMappingURL=nttdata.service.js.map