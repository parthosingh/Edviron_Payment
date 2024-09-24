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
exports.EasebuzzController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let EasebuzzController = class EasebuzzController {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async getQr(res, req) {
        try {
            const collect_id = req.query.collect_id;
            if (!collect_id) {
                throw new common_1.NotFoundException('collect_id not found');
            }
            const collectReq = await this.databaseService.CollectRequestModel.findById(collect_id).select('deepLink');
            if (!collectReq) {
                throw new common_1.NotFoundException('Collect request not found');
            }
            return res.send(collectReq.deepLink);
        }
        catch (error) {
            console.log(error);
            throw new common_1.BadRequestException(error.message);
        }
    }
};
exports.EasebuzzController = EasebuzzController;
__decorate([
    (0, common_1.Get)('/upiqr'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EasebuzzController.prototype, "getQr", null);
exports.EasebuzzController = EasebuzzController = __decorate([
    (0, common_1.Controller)('easebuzz'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EasebuzzController);
//# sourceMappingURL=easebuzz.controller.js.map