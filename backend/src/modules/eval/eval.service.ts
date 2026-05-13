import { Injectable } from '@nestjs/common';
import { MemoryStore } from '../../shared/memory-store';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class EvalService {
  constructor(
    private readonly store: MemoryStore,
    private readonly chat: ChatService,
  ) {}

  questions() {
    return this.store.evalQuestions;
  }

  createQuestion(body: any) {
    return this.store.addEvalQuestion(body.question, body.expectedSource, body.expectedAnswer);
  }

  results() {
    const results = this.store.evalResults;
    const hitCount = results.filter((r) => r.hit).length;
    return {
      summary: {
        total: results.length,
        hitRate: results.length ? Number((hitCount / results.length).toFixed(2)) : 0,
        avgLatency: results.length ? Math.round(results.reduce((sum, r) => sum + r.latency, 0) / results.length) : 0,
      },
      results,
    };
  }

  async run(body: { topK?: number }) {
    const topK = Number(body.topK || 3);
    const batch: any[] = [];

    for (const q of this.store.evalQuestions) {
      const start = Date.now();
      const retrieved = await this.chat.retrieve(q.question, topK);
      const hit = retrieved.some((item) => String(item.documentTitle || '').includes(q.expectedSource));
      const result = this.store.addEvalResult({
        question: q.question,
        expectedSource: q.expectedSource,
        hit,
        recallAtK: hit ? 1 : 0,
        latency: Date.now() - start,
        retrieved: retrieved.map((item) => ({
          documentTitle: item.documentTitle,
          chunkIndex: item.chunkIndex,
          score: item.score,
          rank: item.rank,
          cacheHit: item.cacheHit,
          retrievalMode: item.retrievalMode,
          content: String(item.content || '').slice(0, 180),
        })),
      });
      batch.push(result);
    }

    return { message: '评测完成', topK, results: batch };
  }
}
