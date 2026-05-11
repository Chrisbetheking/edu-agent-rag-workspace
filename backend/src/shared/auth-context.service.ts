import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestUser } from './types';

@Injectable()
export class AuthContextService {
  private readonly guestUsage = new Map<string, { date: string; count: number }>();

  constructor(private readonly jwt: JwtService) {}

  private quotaLimit() {
    return Number(process.env.GUEST_DAILY_QUOTA || 20);
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private safeGuest(): RequestUser {
    return {
      id: 'guest_public',
      username: 'guest',
      displayName: '访客体验',
      role: 'guest',
      quotaLimit: this.quotaLimit(),
      quotaRemaining: this.quotaLimit(),
    };
  }

  getUserFromAuthorization(authorization?: string): RequestUser {
    const token = String(authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return this.safeGuest();

    try {
      const payload: any = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET || 'eduagent-demo-secret',
      });

      const user: RequestUser = {
        id: payload.sub || payload.id || 'u_unknown',
        username: payload.username || 'unknown',
        displayName: payload.displayName || payload.username || '用户',
        role: payload.role || 'guest',
      };

      if (user.role === 'guest') {
        const usage = this.getGuestUsage(user.id);
        user.quotaLimit = this.quotaLimit();
        user.quotaRemaining = Math.max(0, this.quotaLimit() - usage.count);
      }

      return user;
    } catch {
      return this.safeGuest();
    }
  }

  getGuestUsage(userId: string) {
    const date = this.today();
    const current = this.guestUsage.get(userId);
    if (!current || current.date !== date) {
      const next = { date, count: 0 };
      this.guestUsage.set(userId, next);
      return next;
    }
    return current;
  }

  quotaFor(user: RequestUser) {
    if (user.role !== 'guest') return { limit: null, used: null, remaining: null };
    const limit = this.quotaLimit();
    const usage = this.getGuestUsage(user.id);
    return {
      limit,
      used: usage.count,
      remaining: Math.max(0, limit - usage.count),
    };
  }

  consumeGuestQuota(user: RequestUser) {
    if (user.role !== 'guest') return { limit: null, used: null, remaining: null };

    const limit = this.quotaLimit();
    const usage = this.getGuestUsage(user.id);

    if (usage.count >= limit) {
      throw new HttpException(`访客今日 AI 调用额度已用完（${limit} 次）。请明天再试，或使用管理员账号。`, HttpStatus.TOO_MANY_REQUESTS);
    }

    usage.count += 1;
    this.guestUsage.set(user.id, usage);

    return {
      limit,
      used: usage.count,
      remaining: Math.max(0, limit - usage.count),
    };
  }
}
