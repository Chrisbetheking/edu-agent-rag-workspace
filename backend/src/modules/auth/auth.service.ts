import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MemoryStore } from '../../shared/memory-store';

@Injectable()
export class AuthService {
  constructor(private readonly store: MemoryStore, private readonly jwt: JwtService) {}

  login(username: string, password: string) {
    const allow = (username === 'admin' && password === 'admin123') || (username === 'demo' && password === 'demo123');
    if (!allow) throw new UnauthorizedException('账号或密码错误');
    const user = this.store.users.find((u) => u.username === username)!;
    const token = this.jwt.sign({ sub: user.id, username: user.username, role: user.role });
    return { token, user };
  }

  profile() {
    return this.store.users[0];
  }
}
