
import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async signUp(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user) {
            throw new BadRequestException('User already exists');
        }
        // UsersService handles hashing
        await this.usersService.create({ email, password: pass });
        return this.signIn(email, pass);
    }

    async signIn(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);

        if (!user || !(await bcrypt.compare(pass, user.password))) {
            throw new UnauthorizedException();
        }

        const tokens = await this.getTokens(user.id, user.email);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                uuid: user.uuid
            }
        };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const secret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'refreshSecretKey';
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: secret,
            });

            // Opcional: Verificar si el usuario aún existe en DB
            // const user = await this.usersService.findOne(payload.sub);
            // if (!user) throw new ForbiddenException('Access Denied');

            const tokens = await this.getTokens(payload.sub, payload.email);
            return tokens;
        } catch (e) {
            throw new ForbiddenException('Invalid Refresh Token');
        }
    }

    async getTokens(userId: number, email: string) {
        const payload = { sub: userId, email };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_SECRET') || 'secretKey',
                expiresIn: (this.configService.get('JWT_ACCESS_EXPIRATION') || '15m') as any,
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'refreshSecretKey',
                expiresIn: (this.configService.get('JWT_REFRESH_EXPIRATION') || '7d') as any,
            }),
        ]);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }
}
