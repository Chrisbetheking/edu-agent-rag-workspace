import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Get('profile')
  profile(@Headers('authorization') authorization?: string) {
    if (!authorization) throw new UnauthorizedException('Missing authorization header');
    const token = authorization.replace('Bearer ', '');
    return this.authService.profile(token);
  }
}
