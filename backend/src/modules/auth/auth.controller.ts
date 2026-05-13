import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.username, body.password);
  }

  @Post('guest')
  guest() {
    return this.auth.guest();
  }

  @Get('profile')
  profile(@Headers('authorization') authorization?: string) {
    return this.auth.profile(authorization);
  }
}
