import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const demoUser = {
  id: 'demo-admin-001',
  username: 'admin',
  displayName: 'Demo Admin',
  role: 'admin' as const,
};

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(username: string, password: string) {
    if (username !== 'admin' || password !== 'admin123') {
      throw new UnauthorizedException('Invalid username or password');
    }

    const accessToken = this.jwtService.sign({
      sub: demoUser.id,
      username: demoUser.username,
      role: demoUser.role,
    });

    return { accessToken, user: demoUser };
  }

  profile(token: string) {
    try {
      this.jwtService.verify(token);
      return demoUser;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
