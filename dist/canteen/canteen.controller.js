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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanteenController = void 0;
const common_1 = require("@nestjs/common");
const canteen_service_1 = require("./canteen.service");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const jwt = require("jsonwebtoken");
const check_status_service_1 = require("../check-status/check-status.service");
const cashfree_service_1 = require("../cashfree/cashfree.service");
let CanteenController = class CanteenController {
    constructor(canteenService, databaseService, edvironPgService, checkStatusService, cashfreeService) {
        this.canteenService = canteenService;
        this.databaseService = databaseService;
        this.edvironPgService = edvironPgService;
        this.checkStatusService = checkStatusService;
        this.cashfreeService = cashfreeService;
    }
    async createCanteenTransaction(body) {
        try {
            const { amount, callbackUrl, sign, school_id, trustee_id, school_name, cashfree_cred, webHook, disabled_modes, additional_data, custom_order_id, req_webhook_urls, split_payments, gateway, vendors_info, canteen_id } = body;
            if (!amount ||
                !callbackUrl ||
                !sign ||
                !school_id ||
                !trustee_id ||
                !school_name ||
                !gateway ||
                !canteen_id) {
                throw new Error('Missing required fields');
            }
            const decoded = jwt.verify(sign, process.env.KEY);
            if (decoded.school_id !== school_id || decoded.trustee_id !== trustee_id) {
                throw new Error('Request Forged');
            }
            if (gateway.length === 0) {
                throw new Error('Payment Gateway is not Active');
            }
            const request = await this.databaseService.CollectRequestModel.create({
                amount,
                callbackUrl,
                gateway: collect_request_schema_1.Gateway.PENDING,
                clientId: cashfree_cred.clientId,
                clientSecret: cashfree_cred.clientSecret,
                webHookUrl: webHook || null,
                disabled_modes,
                school_id,
                trustee_id,
                additional_data: JSON.stringify(additional_data),
                custom_order_id,
                req_webhook_urls,
                isCanteenTransaction: true,
                canteen_id,
                cashfree_credentials: {
                    cf_x_client_id: cashfree_cred.clientId,
                    cf_x_client_secret: cashfree_cred.clientSecret,
                    cf_api_key: cashfree_cred.cf_api_key,
                }
            });
            await new this.databaseService.CollectRequestStatusModel({
                collect_id: request._id,
                status: collect_req_status_schema_1.PaymentStatus.PENDING,
                order_amount: request.amount,
                transaction_amount: request.amount,
                payment_method: null,
            }).save();
            if (gateway.includes(collect_request_schema_1.Gateway.EDVIRON_PG)) {
                if (!cashfree_cred || !cashfree_cred.clientId || !cashfree_cred.clientSecret) {
                    throw new Error('Cashfree credentials are required for EDVIRON_PG gateway');
                }
                const pay_id = await this.cashfreeService.createOrderCashfree(request);
                const disabled_modes_string = request.disabled_modes
                    .map((mode) => `${mode}=false`)
                    .join('&');
                const url = process.env.URL +
                    '/edviron-pg/redirect?session_id=' +
                    pay_id +
                    '&collect_request_id=' +
                    request._id +
                    '&amount=' +
                    request.amount.toFixed(2) +
                    '&' +
                    disabled_modes_string +
                    '&school_name=' +
                    school_name +
                    '&easebuzz_pg=' +
                    '&currency=' +
                    'INR';
                await this.databaseService.CollectRequestModel.updateOne({
                    _id: request._id,
                }, {
                    payment_data: JSON.stringify(url),
                }, { new: true });
                return { url, request };
            }
        }
        catch (error) {
            console.error('Error creating canteen transaction:', error);
            throw error;
        }
    }
    async checkStatus(body) {
        const { collect_id, sign } = body;
        try {
            if (!collect_id || !sign) {
                throw new Error('Missing required fields');
            }
            const decoded = jwt.verify(sign, process.env.KEY);
            if (decoded.collect_id !== collect_id) {
                throw new Error('Request Forged | Invalid Sign');
            }
            const status = await this.checkStatusService.checkStatus(collect_id);
            return status;
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.CanteenController = CanteenController;
__decorate([
    (0, common_1.Post)('create-collect-request'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CanteenController.prototype, "createCanteenTransaction", null);
__decorate([
    (0, common_1.Post)('check-status'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CanteenController.prototype, "checkStatus", null);
exports.CanteenController = CanteenController = __decorate([
    (0, common_1.Controller)('canteen'),
    __metadata("design:paramtypes", [canteen_service_1.CanteenService,
        database_service_1.DatabaseService,
        edviron_pg_service_1.EdvironPgService,
        check_status_service_1.CheckStatusService,
        cashfree_service_1.CashfreeService])
], CanteenController);
//# sourceMappingURL=canteen.controller.js.map