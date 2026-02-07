import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { CreateCredentialDto } from './dto/create-credential.dto';

@Injectable()
export class CredentialsService {
    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
    ) { }

    async create(userId: number, dto: CreateCredentialDto) {
        const encryptedSecret = this.encryption.encrypt(dto.secret);

        return this.prisma.credential.create({
            data: {
                name: dto.name,
                type: dto.type,
                username: dto.username,
                encryptedSecret, // Stored securely
                userId,
            },
            select: {
                id: true,
                uuid: true,
                name: true,
                type: true,
                username: true,
                createdAt: true,
                // SECRET IS NOT RETURNED
            },
        });
    }

    async findAll(userId: number) {
        return this.prisma.credential.findMany({
            where: { userId },
            select: {
                id: true,
                uuid: true,
                name: true,
                type: true,
                username: true,
                createdAt: true,
            },
        });
    }

    async remove(id: number, userId: number) {
        const cred = await this.prisma.credential.findFirst({ where: { id, userId } });
        if (!cred) throw new NotFoundException('Credential not found');

        return this.prisma.credential.delete({
            where: { id },
        });
    }

    /**
     * Internal method for Orchestrator.
     * Gets the decrypted secret (Git Token, Registry Pass).
     */
    async getDecryptedCredential(id: number): Promise<string | null> {
        const cred = await this.prisma.credential.findUnique({ where: { id } });
        if (!cred) return null;

        return this.encryption.decrypt(cred.encryptedSecret);
    }
}
