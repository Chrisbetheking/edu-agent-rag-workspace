import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

type CacheItem<T> = {
  value: T;
  expiresAt: number;
  createdAt: number;
};

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheItem<any>>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300) {
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
      size: this.store.size,
      keys: Array.from(this.store.keys()).slice(0, 20),
    };
  }
}
