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
exports.EdvironPgController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const edviron_pg_service_1 = require("./edviron-pg.service");
let EdvironPgController = class EdvironPgController {
    constructor(edvironPgService, databaseService) {
        this.edvironPgService = edvironPgService;
        this.databaseService = databaseService;
    }
    async handleRedirect(req, res) {
        res.send(`<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com?session_id=${req.query.session_id}&collect_request_id=${req.query.collect_request_id}&amount=${req.query.amount}";
                }
            </script>`);
    }
    async handleCallback(req, res) {
        const { collect_request_id } = req.query;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        res.redirect(collectRequest?.callbackUrl);
    }
    async handleWebhook(body, res) {
        console.log("webhook called with", { body: JSON.stringify(body) });
        res.send("OK");
    }
};
exports.EdvironPgController = EdvironPgController;
__decorate([
    (0, common_1.Get)("/redirect"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleRedirect", null);
__decorate([
    (0, common_1.Get)("/callback"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Post)("/webhook"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EdvironPgController.prototype, "handleWebhook", null);
exports.EdvironPgController = EdvironPgController = __decorate([
    (0, common_1.Controller)('edviron-pg'),
    __metadata("design:paramtypes", [edviron_pg_service_1.EdvironPgService, database_service_1.DatabaseService])
], EdvironPgController);
//# sourceMappingURL=edviron-pg.controller.js.map