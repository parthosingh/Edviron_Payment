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
exports.EdvironPgService = void 0;
const common_1 = require("@nestjs/common");
const transactionStatus_1 = require("../types/transactionStatus");
let EdvironPgService = class EdvironPgService {
    constructor() { }
    async collect(request) {
        try {
            const axios = require('axios');
            let data = JSON.stringify({
                customer_details: {
                    customer_id: '7112AAA812234',
                    customer_phone: '9898989898',
                },
                order_currency: 'INR',
                order_amount: request.amount.toFixed(2),
                order_id: request._id,
                order_meta: {
                    return_url: process.env.URL +
                        '/edviron-pg/callback?collect_request_id=' +
                        request._id,
                },
            });
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${process.env.CASHFREE_ENDPOINT}/pg/orders`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-version': '2023-08-01',
                    'x-partner-merchantid': request.clientId,
                    'x-partner-apikey': process.env.CASHFREE_API_KEY,
                },
                data: data,
            };
            const { data: cashfreeRes } = await axios.request(config);
            const disabled_modes_string = request.disabled_modes
                .map((mode) => `${mode}=false`)
                .join('&');
            return {
                url: process.env.URL +
                    '/edviron-pg/redirect?session_id=' +
                    cashfreeRes.payment_session_id +
                    '&collect_request_id=' +
                    request._id +
                    '&amount=' +
                    request.amount.toFixed(2) +
                    '&' +
                    disabled_modes_string,
            };
        }
        catch (err) {
            console.log(err);
            if (err.name === 'AxiosError')
                throw new common_1.BadRequestException('Invalid client id or client secret ' +
                    JSON.stringify(err.response.data));
            console.log(err);
        }
    }
    async checkStatus(collect_request_id, collect_request) {
        const axios = require('axios');
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.CASHFREE_ENDPOINT}/pg/orders/` + collect_request_id,
            headers: {
                accept: 'application/json',
                'x-api-version': '2023-08-01',
                'x-partner-merchantid': collect_request.clientId,
                'x-partner-apikey': process.env.CASHFREE_API_KEY,
            },
        };
        console.log({ config });
        const { data: cashfreeRes } = await axios.request(config);
        console.log({ cashfreeRes });
        const order_status_to_transaction_status_map = {
            ACTIVE: transactionStatus_1.TransactionStatus.PENDING,
            PAID: transactionStatus_1.TransactionStatus.SUCCESS,
            EXPIRED: transactionStatus_1.TransactionStatus.FAILURE,
            TERMINATED: transactionStatus_1.TransactionStatus.FAILURE,
            TERMINATION_REQUESTED: transactionStatus_1.TransactionStatus.FAILURE,
        };
        console.log({ cashfreeRes });
        return {
            status: order_status_to_transaction_status_map[cashfreeRes.order_status],
            amount: cashfreeRes.order_amount,
            details: {
                payment_methods: cashfreeRes.order_meta.payment_methods,
            },
        };
    }
};
exports.EdvironPgService = EdvironPgService;
exports.EdvironPgService = EdvironPgService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EdvironPgService);
//# sourceMappingURL=edviron-pg.service.js.map