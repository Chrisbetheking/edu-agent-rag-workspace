import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool?: Pool;
  readonly enabled: boolean;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';

    this.enabled = Boolean(connectionString);

    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 5,
      });
    }
  }

  async query<T = any>(sql: string, params: any[] = []) {
    if (!this.pool) {
      throw new Error('DATABASE_URL is not configured.');
    }

    return this.pool.query<T>(sql, params);
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
