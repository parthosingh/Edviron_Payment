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
exports.CcavenueController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const ccavenue_service_1 = require("./ccavenue.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
let CcavenueController = class CcavenueController {
    constructor(ccavenueService, databaseService) {
        this.ccavenueService = ccavenueService;
        this.databaseService = databaseService;
    }
    async handleRedirect(req, res) {
        res.send(`<form method="post" name="redirect"
                    action="https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"/>
                    <input type="hidden" id="encRequest" name="encRequest" value="${req.query.encRequest}">
                    <input type="hidden" name="access_code" id="access_code" value="${req.query.access_code}">
                </form>
                
                <script type="text/javascript">
                    window.onload = function(){
                        document.forms['redirect'].submit();
                    }
                </script>`);
    }
    async handleCallback(body, res, req) {
        console.log('callback recived from ccavenue');
        try {
            console.log(req.query.collect_id);
            const collectIdObject = req.query.collect_id;
            const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
            if (!collectReq)
                throw new Error('Collect request not found');
            collectReq.gateway = collect_request_schema_1.Gateway.EDVIRON_CCAVENUE;
            await collectReq.save();
            res.redirect(collectReq?.callbackUrl);
        }
        catch (e) {
            console.log(`Error,${e}`);
            throw new Error(`Error in callback,${e.message}`);
        }
    }
};
exports.CcavenueController = CcavenueController;
__decorate([
    (0, common_1.Get)('/redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CcavenueController.prototype, "handleRedirect", null);
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CcavenueController.prototype, "handleCallback", null);
exports.CcavenueController = CcavenueController = __decorate([
    (0, common_1.Controller)('ccavenue'),
    __metadata("design:paramtypes", [ccavenue_service_1.CcavenueService,
        database_service_1.DatabaseService])
], CcavenueController);
//# sourceMappingURL=ccavenue.controller.js.map