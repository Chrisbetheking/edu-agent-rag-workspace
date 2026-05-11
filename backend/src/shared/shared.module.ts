import { Global, Module } from '@nestjs/common';
import { MemoryStore } from './memory-store';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [MemoryStore, DatabaseService],
  exports: [MemoryStore, DatabaseService],
})
export class SharedModule {}
