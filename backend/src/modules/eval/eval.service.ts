import { Injectable } from '@nestjs/common';
import { MemoryStore } from '../../shared/memory-store';
import { keywordScore } from '../../shared/text-utils';

@Injectable()
export class EvalService {
  constructor(private readonly store: MemoryStore) {}

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

  run(body: { topK?: number }) {
    const topK = Number(body.topK || 3);
    const batch: any[] = [];
    for (const q of this.store.evalQuestions) {
      const start = Date.now();
      const retrieved = this.store.chunks
        .map((chunk) => ({ documentTitle: chunk.documentTitle, content: chunk.content, score: keywordScore(q.question, chunk.content) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      const hit = retrieved.some((item) => item.documentTitle.includes(q.expectedSource));
      const result = this.store.addEvalResult({
        question: q.question,
        expectedSource: q.expectedSource,
        hit,
        recallAtK: hit ? 1 : 0,
        latency: Date.now() - start,
        retrieved,
      });
      batch.push(result);
    }
    return { message: '评测完成', topK, results: batch };
  }
}
