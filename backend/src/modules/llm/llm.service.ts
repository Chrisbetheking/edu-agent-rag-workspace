import { Injectable } from '@nestjs/common';

type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

@Injectable()
export class LlmService {
  private get apiKey() {
    return process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  }

  private get baseUrl() {
    return (process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  }

  private get model() {
    return process.env.LLM_MODEL || 'deepseek-chat';
  }

  private get maxTokens() {
    return Number(process.env.LLM_MAX_TOKENS || 800);
  }

  private get timeoutMs() {
    return Number(process.env.LLM_TIMEOUT_MS || 30000);
  }

  private buildUrl() {
    if (this.baseUrl.endsWith('/chat/completions')) {
      return this.baseUrl;
    }

    return `${this.baseUrl}/chat/completions`;
  }

  async chat(messages: LlmMessage[]) {
    if (!this.apiKey) {
      throw new Error('缺少 LLM_API_KEY。请在 Render 环境变量中添加 LLM_API_KEY。');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.4,
          max_tokens: this.maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          data?.error?.message ||
          data?.message ||
          rawText ||
          `LLM HTTP ${response.status}`;

        throw new Error(`DeepSeek API 请求失败：HTTP ${response.status}，${message}`);
      }

      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`DeepSeek API 返回为空：${rawText.slice(0, 500)}`);
      }

      return String(content).trim();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error(`DeepSeek API 请求超时，已超过 ${this.timeoutMs}ms。`);
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
