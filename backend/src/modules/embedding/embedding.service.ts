import { Injectable } from '@nestjs/common';

interface EmbeddingApiResponse {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
}

@Injectable()
export class EmbeddingService {
  private readonly baseUrl = this.normalizeBaseUrl(process.env.EMBEDDING_BASE_URL || '');
  private readonly apiKey = process.env.EMBEDDING_API_KEY || '';
  private readonly model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
  private readonly dimension = Number(process.env.EMBEDDING_DIMENSION || 1536);
  private readonly timeoutMs = Number(process.env.EMBEDDING_TIMEOUT_MS || 20000);

  isConfigured() {
    return Boolean(this.apiKey && this.baseUrl && this.model);
  }

  modelName() {
    return this.model;
  }

  vectorDimension() {
    return Number.isFinite(this.dimension) && this.dimension > 0 ? this.dimension : 1536;
  }

  async embed(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      throw new Error('EMBEDDING_API_KEY / EMBEDDING_BASE_URL / EMBEDDING_MODEL is not configured.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: this.normalizeInput(text),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as EmbeddingApiResponse;

      if (!response.ok) {
        throw new Error(payload?.error?.message || `Embedding API failed with status ${response.status}`);
      }

      const vector = payload?.data?.[0]?.embedding;
      if (!Array.isArray(vector) || !vector.length) {
        throw new Error('Embedding API returned empty vector.');
      }

      return vector.map((value) => Number(value));
    } finally {
      clearTimeout(timer);
    }
  }

  toSqlVector(vector: number[]) {
    return `[${vector.map((item) => Number(item).toFixed(8)).join(',')}]`;
  }

  summary() {
    return {
      configured: this.isConfigured(),
      baseUrl: this.baseUrl ? this.maskBaseUrl(this.baseUrl) : '',
      model: this.model,
      dimension: this.vectorDimension(),
    };
  }

  private normalizeBaseUrl(url: string) {
    return url.trim().replace(/\/+$/, '');
  }

  private normalizeInput(text: string) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, Number(process.env.EMBEDDING_INPUT_MAX_CHARS || 6000));
  }

  private maskBaseUrl(url: string) {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
    } catch {
      return url;
    }
  }
}
