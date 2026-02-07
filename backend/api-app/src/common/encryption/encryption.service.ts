import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService implements OnModuleInit {
    private algorithm = 'aes-256-cbc';
    private key: Buffer;

    // IV length for AES-256-CBC is 16 bytes
    private ivLength = 16;

    onModuleInit() {
        // Validate that ENCRYPTION_KEY exists and is valid
        const keyString = process.env.ENCRYPTION_KEY;
        if (!keyString) {
            throw new Error('FATAL: ENCRYPTION_KEY is not defined in .env variable. Cannot start EncryptionService.');
        }

        // Key must be 32 bytes (256 bits)
        // We allow a hex string or a raw string that we hash to 32 bytes
        this.key = crypto.createHash('sha256').update(String(keyString)).digest();
    }

    encrypt(text: string): string {
        if (!text) return text;

        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        // Return Format: IV:EncryptedData (all in hex)
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    decrypt(text: string): string {
        if (!text) return text;

        const textParts = text.split(':');
        if (textParts.length < 2) {
            throw new Error('Invalid encrypted text format.');
        }

        const ivHex = textParts.shift();
        if (!ivHex) {
            throw new Error('Invalid IV format.');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');

        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    }
}
