import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { CreateTargetDto } from './dto/create-target.dto';

@Injectable()
export class TargetsService {
    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
    ) { }

    async create(userId: number, dto: CreateTargetDto) {
        // Encrypt secrets if provided
        const encryptedPassword = dto.password
            ? this.encryption.encrypt(dto.password)
            : null;

        const encryptedPrivateKey = dto.privateKey
            ? this.encryption.encrypt(dto.privateKey)
            : null;

        return this.prisma.target.create({
            data: {
                name: dto.name,
                host: dto.host,
                port: dto.port || 22,
                username: dto.username,
                encryptedPassword,
                encryptedPrivateKey,
                userId,
            },
            select: {
                id: true,
                uuid: true,
                name: true,
                host: true,
                username: true,
                status: true,
                createdAt: true,
                // DO NOT RETURN ENCRYPTED SECRETS
            },
        });
    }

    async findAll(userId: number) {
        return this.prisma.target.findMany({
            where: { userId },
            select: {
                id: true,
                uuid: true,
                name: true,
                host: true,
                username: true,
                status: true,
                createdAt: true,
            },
        });
    }

    async findOne(id: number, userId: number) {
        const target = await this.prisma.target.findFirst({
            where: { id, userId }
        });

        if (!target) return null;

        // Internal use might need secrets, but for API we allow returning basic info
        // For orchestration, we'll have a separate method
        return {
            ...target,
            encryptedPassword: undefined, // Hide secrets
            encryptedPrivateKey: undefined
        };
    }

    async remove(id: number, userId: number) {
        const target = await this.prisma.target.findFirst({ where: { id, userId } });
        if (!target) throw new NotFoundException('Target not found');

        return this.prisma.target.delete({
            where: { id },
        });
    }

    /**
     * Internal method for Orchestration Service.
     * DECIPHERS credentials.
     * VALIDATES ownership (Target must belong to userId).
     */
    async getDecryptedTargetForUser(id: number, userId: number): Promise<any> {
        const target = await this.prisma.target.findFirst({ where: { id, userId } });
        if (!target) return null;

        return {
            ...target,
            password: target.encryptedPassword
                ? this.encryption.decrypt(target.encryptedPassword)
                : undefined,
            privateKey: target.encryptedPrivateKey
                ? this.encryption.decrypt(target.encryptedPrivateKey)
                : undefined,
        };
    }
}
