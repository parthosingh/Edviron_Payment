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
exports.GatewayController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let GatewayController = class GatewayController {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async getGatewayLinks(collect_id) {
        try {
            if (!collect_id) {
                throw new common_1.BadRequestException('Collect id missing');
            }
            const request = await this.databaseService.CollectRequestModel.findById(collect_id);
            if (!request) {
                throw new common_1.BadRequestException('invalid collect_id');
            }
            if (!request.isMasterGateway || !request.non_seamless_payment_links) {
                throw new common_1.BadRequestException('Master gateway not enabled');
            }
            let edviron_gateways = {
                cashfree: null,
                easebuzz: null,
                razorpay: null
            };
            if (request.paymentIds?.cashfree_id) {
                edviron_gateways.cashfree = `${request.non_seamless_payment_links.edviron_pg}&gateway=cashfree`;
            }
            if (request.paymentIds?.easebuzz_id || request.non_seamless_payment_links.edv_easebuzz) {
                edviron_gateways.easebuzz = `${request.non_seamless_payment_links.edv_easebuzz}&gateway=easebuzz`;
            }
            return {
                edviron_gateways,
                banks_gateways: request.non_seamless_payment_links || {}
            };
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
};
exports.GatewayController = GatewayController;
__decorate([
    (0, common_1.Get)('/get-links'),
    __param(0, (0, common_1.Query)('collect_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "getGatewayLinks", null);
exports.GatewayController = GatewayController = __decorate([
    (0, common_1.Controller)('gateway'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], GatewayController);
//# sourceMappingURL=gateway.controller.js.map