import { Injectable } from '@nestjs/common';
import { MemoryStore } from '../../shared/memory-store';

@Injectable()
export class PromptsService {
  constructor(private readonly store: MemoryStore) {}

  list() {
    return this.store.prompts;
  }

  create(body: any) {
    return this.store.upsertPrompt(body);
  }

  update(id: string, body: any) {
    return this.store.upsertPrompt({ id, ...body });
  }

  remove(id: string) {
    this.store.prompts = this.store.prompts.filter((p) => p.id !== id);
    return { message: '删除成功' };
  }
}
