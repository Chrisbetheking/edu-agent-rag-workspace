import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MemoryStore } from './memory-store';
import { DatabaseService } from './database.service';
import { AuthContextService } from './auth-context.service';

@Global()
@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'eduagent-demo-secret' })],
  providers: [MemoryStore, DatabaseService, AuthContextService],
  exports: [MemoryStore, DatabaseService, AuthContextService],
})
export class SharedModule {}
