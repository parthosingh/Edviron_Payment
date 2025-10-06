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
exports.StudentSchemaSchema = exports.StudentSchema = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let StudentSchema = class StudentSchema {
};
exports.StudentSchema = StudentSchema;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], StudentSchema.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], StudentSchema.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StudentSchema.prototype, "student_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StudentSchema.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StudentSchema.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StudentSchema.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StudentSchema.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StudentSchema.prototype, "number", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], StudentSchema.prototype, "other_info", void 0);
exports.StudentSchema = StudentSchema = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], StudentSchema);
exports.StudentSchemaSchema = mongoose_1.SchemaFactory.createForClass(StudentSchema);
//# sourceMappingURL=students.schema.js.map