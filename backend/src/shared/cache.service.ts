import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';

type CacheItem<T> = {
  value: T;
  expiresAt: number;
  createdAt: number;
};

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly store = new Map<string, CacheItem<any>>();
  private readonly redis?: Redis;
  private redisUnavailable = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.redis.on('error', (error) => {
      this.redisUnavailable = true;
      console.error('Redis cache unavailable, fallback to memory cache:', error.message);
    });

    this.redis.on('connect', () => {
      this.redisUnavailable = false;
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis && !this.redisUnavailable) {
      try {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        this.redisUnavailable = true;
      }
    }

    return this.getFromMemory<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds = 300) {
    if (this.redis && !this.redisUnavailable) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch {
        this.redisUnavailable = true;
      }
    }

    this.store.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  makeKey(prefix: string, payload: unknown) {
    const digest = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .slice(0, 24);
    return `${prefix}:${digest}`;
  }

  stats() {
    return {
      mode: this.redis && !this.redisUnavailable ? 'redis' : 'memory',
      memorySize: this.store.size,
      redisConfigured: Boolean(this.redis),
      redisUnavailable: this.redisUnavailable,
      keys: Array.from(this.store.keys()).slice(0, 20),
    };
  }

  private getFromMemory<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }
}
