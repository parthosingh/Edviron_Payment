import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private key: Buffer;
  private iv: Buffer;

  constructor() {
    this.initializeKeyAndIV();
  }

  private initializeKeyAndIV() {
    const merchantKey = process.env.EASEBUZZ_KEY;
    const salt = process.env.EASEBUZZ_SALT;

    if (!merchantKey || !salt) {
      throw new Error(
        'EASEBUZZ_KEY and EASEBUZZ_SALT must be set in environment variables',
      );
    }

    this.key = crypto
      .createHash('sha256')
      .update(merchantKey)
      .digest()
      .slice(0, 32);
    this.iv = crypto.createHash('sha256').update(salt).digest().slice(0, 16);
  }

  encryptCard(data: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  encryptCardDetails(cardDetails: {
    card_number: string;
    card_holder_name: string;
    card_cvv: string;
    card_expiry_date: string;
  }): {
    card_number: string;
    card_holder_name: string;
    card_cvv: string;
    card_expiry_date: string;
  } {
    return {
      card_number: this.encryptCard(cardDetails.card_number),
      card_holder_name: this.encryptCard(cardDetails.card_holder_name),
      card_cvv: this.encryptCard(cardDetails.card_cvv),
      card_expiry_date: this.encryptCard(cardDetails.card_expiry_date),
    };
  }
}
