
import { Body, Controller, Post, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async signIn(@Body() signInDto: Record<string, any>) {
        return this.authService.signIn(signInDto.email, signInDto.password);
    }

    @HttpCode(HttpStatus.CREATED)
    @Post('register')
    async signUp(@Body() signUpDto: Record<string, any>) {
        return this.authService.signUp(signUpDto.email, signUpDto.password);
    }

    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    async refresh(@Body() refreshDto: Record<string, any>) {
        return this.authService.refreshTokens(refreshDto.refresh_token);
    }
}
