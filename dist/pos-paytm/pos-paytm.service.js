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
exports.PosPaytmService = void 0;
const common_1 = require("@nestjs/common");
let PosPaytmService = class PosPaytmService {
    constructor() { }
    async createOrder(collectRequest) {
        try {
            const requestData = {
                head: {
                    requestTimeStamp: new Date().toISOString(),
                    channelId: 'RIL',
                    checksum: 'FFFFFFFFFF2345000004',
                    version: '3.1'
                },
                body: {
                    paytmMid: 'YOUR_MID_HERE',
                    paytmTid: '12346490',
                    transactionDateTime: new Date().toISOString(),
                    merchantTransactionId: '123456343245',
                    merchantReferenceNo: '234564323456',
                    transactionAmount: '9000',
                    merchantExtendedInfo: {
                        PaymentMode: 'All'
                    }
                }
            };
        }
        catch (error) {
        }
    }
};
exports.PosPaytmService = PosPaytmService;
exports.PosPaytmService = PosPaytmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PosPaytmService);
//# sourceMappingURL=pos-paytm.service.js.map