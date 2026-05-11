import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';
import { MemoryStore } from '../../shared/memory-store';
import { AuthContextService } from '../../shared/auth-context.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly store: MemoryStore,
    private readonly jwt: JwtService,
    private readonly authContext: AuthContextService,
  ) {}

  private sign(user: any) {
    return this.jwt.sign({
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    });
  }

  login(username: string, password: string) {
    const inputUsername = String(username || '').trim();
    const inputPassword = String(password || '').trim();
    const adminUsername = process.env.ADMIN_USERNAME || 'CHRISWANG';
    const adminPassword = process.env.ADMIN_PASSWORD || '060712';

    const allow = inputUsername.toUpperCase() === adminUsername.toUpperCase() && inputPassword === adminPassword;
    if (!allow) throw new UnauthorizedException('账号或密码错误');

    const user = this.store.users.find((u) => u.username.toUpperCase() === adminUsername.toUpperCase()) || {
      id: 'u_chris',
      username: adminUsername,
      displayName: 'Chris Wang',
      role: 'admin',
    };

    const token = this.sign(user);
    return { token, user };
  }

  guest() {
    const user = {
      id: `guest_${uuid().replace(/-/g, '').slice(0, 12)}`,
      username: 'guest',
      displayName: '访客体验',
      role: 'guest',
    };

    const quota = this.authContext.quotaFor(user as any);
    const token = this.sign(user);

    return {
      token,
      user: {
        ...user,
        quotaLimit: quota.limit,
        quotaRemaining: quota.remaining,
      },
    };
  }

  profile(authorization?: string) {
    const user = this.authContext.getUserFromAuthorization(authorization);
    const quota = this.authContext.quotaFor(user);
    return {
      ...user,
      quotaLimit: quota.limit ?? user.quotaLimit,
      quotaRemaining: quota.remaining ?? user.quotaRemaining,
    };
  }
}
