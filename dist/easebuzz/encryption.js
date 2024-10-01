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
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
let EncryptionService = class EncryptionService {
    constructor() {
        this.initializeKeyAndIV();
    }
    initializeKeyAndIV() {
        const merchantKey = process.env.EASEBUZZ_KEY;
        const salt = process.env.EASEBUZZ_SALT;
        if (!merchantKey || !salt) {
            throw new Error('EASEBUZZ_KEY and EASEBUZZ_SALT must be set in environment variables');
        }
        this.key = crypto.createHash('sha256').update(merchantKey).digest().slice(0, 32);
        this.iv = crypto.createHash('sha256').update(salt).digest().slice(0, 16);
    }
    encryptCard(data) {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }
    encryptCardDetails(cardDetails) {
        return {
            card_number: this.encryptCard(cardDetails.card_number),
            card_holder_name: this.encryptCard(cardDetails.card_holder_name),
            card_cvv: this.encryptCard(cardDetails.card_cvv),
            card_expiry_date: this.encryptCard(cardDetails.card_expiry_date),
        };
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EncryptionService);
//# sourceMappingURL=encryption.js.map