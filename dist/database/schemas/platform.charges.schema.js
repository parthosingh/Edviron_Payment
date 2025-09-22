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
exports.SchoolMdrSchema = exports.SchoolMdr = exports.PlatformCharge = exports.rangeCharge = exports.charge_type = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var charge_type;
(function (charge_type) {
    charge_type["FLAT"] = "FLAT";
    charge_type["PERCENT"] = "PERCENT";
})(charge_type || (exports.charge_type = charge_type = {}));
let rangeCharge = class rangeCharge {
};
exports.rangeCharge = rangeCharge;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], rangeCharge.prototype, "upto", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], rangeCharge.prototype, "charge_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], rangeCharge.prototype, "charge", void 0);
exports.rangeCharge = rangeCharge = __decorate([
    (0, mongoose_1.Schema)()
], rangeCharge);
let PlatformCharge = class PlatformCharge {
};
exports.PlatformCharge = PlatformCharge;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", String)
], PlatformCharge.prototype, "platform_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", String)
], PlatformCharge.prototype, "payment_mode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Array)
], PlatformCharge.prototype, "range_charge", void 0);
exports.PlatformCharge = PlatformCharge = __decorate([
    (0, mongoose_1.Schema)()
], PlatformCharge);
let SchoolMdr = class SchoolMdr {
};
exports.SchoolMdr = SchoolMdr;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Array)
], SchoolMdr.prototype, "platform_charges", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId }),
    __metadata("design:type", Object)
], SchoolMdr.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId }),
    __metadata("design:type", Object)
], SchoolMdr.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SchoolMdr.prototype, "comment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], SchoolMdr.prototype, "currency", void 0);
exports.SchoolMdr = SchoolMdr = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], SchoolMdr);
exports.SchoolMdrSchema = mongoose_1.SchemaFactory.createForClass(SchoolMdr);
//# sourceMappingURL=platform.charges.schema.js.map