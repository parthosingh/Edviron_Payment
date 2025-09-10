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
exports.ErpWebhooksLogsSchema = exports.ErpWebhooksLogs = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const collect_request_schema_1 = require("./collect_request.schema");
let ErpWebhooksLogs = class ErpWebhooksLogs {
};
exports.ErpWebhooksLogs = ErpWebhooksLogs;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.default.Schema.Types.ObjectId,
        ref: 'CollectRequest',
    }),
    __metadata("design:type", collect_request_schema_1.CollectRequest)
], ErpWebhooksLogs.prototype, "collect_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ErpWebhooksLogs.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ErpWebhooksLogs.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ErpWebhooksLogs.prototype, "webhooktype", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ErpWebhooksLogs.prototype, "payload", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ErpWebhooksLogs.prototype, "response", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ErpWebhooksLogs.prototype, "status_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], ErpWebhooksLogs.prototype, "isSuccess", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ErpWebhooksLogs.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ErpWebhooksLogs.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ErpWebhooksLogs.prototype, "webhook_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ErpWebhooksLogs.prototype, "triggered_time", void 0);
exports.ErpWebhooksLogs = ErpWebhooksLogs = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ErpWebhooksLogs);
exports.ErpWebhooksLogsSchema = mongoose_1.SchemaFactory.createForClass(ErpWebhooksLogs);
//# sourceMappingURL=erp.webhooks.logs.schema.js.map