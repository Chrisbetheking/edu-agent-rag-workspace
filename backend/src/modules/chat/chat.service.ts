import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Response } from 'express';
import { MemoryStore } from '../../shared/memory-store';
import { keywordScore } from '../../shared/text-utils';
import { DatabaseService } from '../../shared/database.service';
import { AuthContextService } from '../../shared/auth-context.service';
import { CacheService } from '../../shared/cache.service';
import { RequestUser } from '../../shared/types';
import { ToolsService } from '../tools/tools.service';
import { LlmService } from '../llm/llm.service';
import { EmbeddingService } from '../embedding/embedding.service';

export interface SchoolAdvice {
  name: string;
  reason: string;
  fit: string;
  risk: string;
  action: string;
}

export interface SchoolTier {
  tier: string;
  level: string;
  strategy: string;
  schools: SchoolAdvice[];
}

export interface TimelineItem {
  phase: string;
  time: string;
  tasks: string[];
}

export interface StructuredAdvice {
  summary: string;
  profile: {
    education: string;
    gpa: string;
    targetCountry: string;
    targetMajor: string;
    budget: string;
    competitiveness: string;
  };
  schoolTiers: SchoolTier[];
  timeline: TimelineItem[];
  risks: string[];
  nextActions: string[];
  disclaimer: string;
}

@Injectable()
export class ChatService {
  private callLogSchemaReady = false;

  constructor(
    private readonly store: MemoryStore,
    private readonly tools: ToolsService,
    private readonly llmService: LlmService,
    private readonly db: DatabaseService,
    private readonly authContext: AuthContextService,
    private readonly cache: CacheService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async conversations(user: RequestUser = { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' }): Promise<any[]> {
    if (this.db.enabled) {
      try {
        const result = await this.db.query(
          `
          select id, user_id, title, created_at, updated_at
          from conversations
          where ($1 = 'admin') or user_id = $2
          order by updated_at desc
          limit 50
          `,
          [user.role, user.id],
        );

        return result.rows.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          title: row.title,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } catch (error) {
        console.error('从 Supabase 读取 conversations 失败：', error);
      }
    }

    return user.role === 'admin' ? this.store.conversations : this.store.conversations.filter((c) => c.userId === user.id);
  }

  async createConversation(title: string, user: RequestUser = { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' }): Promise<any> {
    const conv = this.store.createConversation(title || '新的留学咨询会话', user.id);
    await this.persistConversation(conv.id, conv.title, user);
    return conv;
  }

  async messages(conversationId: string, user: RequestUser = { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' }): Promise<any[]> {
    if (this.db.enabled) {
      try {
        const result = await this.db.query(
          `
          select id, conversation_id, role, content, sources, tool_calls, created_at
          from messages
          where conversation_id = $1
            and (
              $2 = 'admin'
              or exists (select 1 from conversations c where c.id = messages.conversation_id and c.user_id = $3)
            )
          order by created_at asc
          limit 200
          `,
          [conversationId, user.role, user.id],
        );

        return result.rows.map((row: any) => ({
          id: row.id,
          conversationId: row.conversation_id,
          role: row.role,
          content: row.content,
          sources: row.sources || [],
          toolCalls: row.tool_calls || [],
          createdAt: row.created_at,
        }));
      } catch (error) {
        console.error('从 Supabase 读取 messages 失败：', error);
      }
    }

    const allowed = user.role === 'admin' || this.store.conversations.some((c) => c.id === conversationId && c.userId === user.id);
    return allowed ? this.store.messages.filter((m) => m.conversationId === conversationId) : [];
  }

  async retrieve(query: string, topK = 3, user: RequestUser = { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' }): Promise<any[]> {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const cacheKey = this.cache.makeKey('rag:v7-intent-locked-hybrid-rerank', {
      query: normalizedQuery,
      topK,
      userId: user.id,
      role: user.role,
      embeddingConfigured: this.embeddingService.isConfigured(),
      embeddingModel: this.embeddingService.modelName(),
      hybridVersion: 'clean-kb-v3-intent-locked-keyword-supplement-rerank',
    });

    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) {
      return cached.map((item, index) => ({ ...item, cacheHit: true, rank: index + 1 }));
    }

    let results = await this.retrieveWithVector(query, topK, user);

    if (!results.length) {
      results = await this.retrieveWithKeyword(query, topK, user);
    }

    const ranked = results.map((item, index) => ({ ...item, rank: index + 1 }));
    await this.cache.set(cacheKey, ranked, Number(process.env.RAG_CACHE_TTL_SECONDS || 300));
    return ranked;
  }

  private async retrieveWithVector(query: string, topK: number, user: RequestUser): Promise<any[]> {
    if (!this.db.enabled || !this.embeddingService.isConfigured()) return [];

    try {
      // For small/medium demo KBs, retrieve a broad candidate pool first.
      // Pure vector top-3 can rank semantically related but intent-wrong docs above exact material docs.
      const candidateLimit = Math.max(topK * 40, Number(process.env.RAG_VECTOR_CANDIDATE_LIMIT || 300));
      const keywordCandidateLimit = Number(process.env.RAG_KEYWORD_CANDIDATE_LIMIT || 1200);
      const embedding = await this.embeddingService.embed(query);
      const vector = this.embeddingService.toSqlVector(embedding);
      const result = await this.db.query(
        `
        select
          c.id,
          c.document_id,
          c.document_title,
          c.content,
          c.chunk_index,
          c.keywords,
          coalesce(c.owner_id, d.owner_id, 'u_chris') as owner_id,
          1 - (c.embedding <=> $1::vector) as score
        from chunks c
        left join documents d on d.id = c.document_id
        where c.embedding is not null
          and (($2 = 'admin') or coalesce(d.visibility, 'public') = 'public' or coalesce(c.owner_id, d.owner_id, 'u_chris') = $3)
        order by c.embedding <=> $1::vector
        limit $4
        `,
        [vector, user.role, user.id, candidateLimit],
      );

      const vectorCandidates = result.rows.map((row: any) => ({
        id: row.id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        content: row.content,
        chunkIndex: row.chunk_index,
        keywords: row.keywords || [],
        score: Number(Number(row.score || 0).toFixed(4)),
        retrievalMode: 'pgvector',
        cacheHit: false,
        candidateSource: 'vector',
      }));

      // Add intent-locked candidates by document title. This protects high-intent queries such as
      // "申请材料" from being dominated by semantically related project/portfolio documents.
      const intentCandidates = await this.retrieveIntentCandidates(query, user);

      // Add keyword recall candidates so exact intent docs can be rescued even if vector recall ranks them too low.
      // Final ranking is still hybrid and observable; pgvector remains the primary retrieval path.
      let keywordCandidates: any[] = [];
      try {
        const keywordResult = await this.db.query(
          `
          select
            c.id,
            c.document_id,
            c.document_title,
            c.content,
            c.chunk_index,
            c.keywords,
            coalesce(c.owner_id, d.owner_id, 'u_chris') as owner_id
          from chunks c
          left join documents d on d.id = c.document_id
          where (($1 = 'admin') or coalesce(d.visibility, 'public') = 'public' or coalesce(c.owner_id, d.owner_id, 'u_chris') = $2)
          order by c.created_at desc
          limit $3
          `,
          [user.role, user.id, keywordCandidateLimit],
        );

        keywordCandidates = keywordResult.rows
          .map((row: any) => {
            const signal = keywordScore(query, `${row.document_title || ''}\n${(row.keywords || []).join(' ')}\n${row.content || ''}`);
            return {
              id: row.id,
              documentId: row.document_id,
              documentTitle: row.document_title,
              content: row.content,
              chunkIndex: row.chunk_index,
              keywords: row.keywords || [],
              score: 0,
              keywordSignal: signal,
              retrievalMode: 'pgvector',
              cacheHit: false,
              candidateSource: 'keyword-supplement',
            };
          })
          .filter((candidate: any) => candidate.keywordSignal > 0 || this.hybridBoost(query, candidate) > 0.2);
      } catch (keywordError: any) {
        console.error('keyword supplement recall failed, continue with vector candidates:', keywordError?.message || keywordError);
      }

      const merged = new Map<string, any>();
      for (const candidate of [...intentCandidates, ...vectorCandidates, ...keywordCandidates]) {
        const key = candidate.id || `${candidate.documentId}:${candidate.chunkIndex}`;
        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, candidate);
          continue;
        }

        merged.set(key, {
          ...existing,
          ...candidate,
          score: Math.max(Number(existing.score || 0), Number(candidate.score || 0)),
          keywordSignal: Math.max(Number(existing.keywordSignal || 0), Number(candidate.keywordSignal || 0)),
          intentPriority: Math.max(Number(existing.intentPriority || 0), Number(candidate.intentPriority || 0)),
          candidateSource: existing.candidateSource === 'vector' ? 'vector+keyword' : candidate.candidateSource,
          retrievalMode: 'pgvector',
        });
      }

      return this.rerankRetrieved(query, Array.from(merged.values()), topK);
    } catch (error: any) {
      console.error('pgvector 语义检索失败，回退 keyword RAG：', error?.message || error);
      return [];
    }
  }

  private async retrieveWithKeyword(query: string, topK: number, user: RequestUser): Promise<any[]> {
    let results: any[] = [];

    if (this.db.enabled) {
      try {
        const result = await this.db.query(
          `
          select c.id, c.document_id, c.document_title, c.content, c.chunk_index, c.keywords, coalesce(c.owner_id, d.owner_id, 'u_chris') as owner_id
          from chunks c
          left join documents d on d.id = c.document_id
          where ($1 = 'admin') or coalesce(d.visibility, 'public') = 'public' or coalesce(c.owner_id, d.owner_id, 'u_chris') = $2
          order by c.created_at desc
          limit 1000
          `,
          [user.role, user.id],
        );

        const candidates = result.rows
          .map((row: any) => ({
            id: row.id,
            documentId: row.document_id,
            documentTitle: row.document_title,
            content: row.content,
            chunkIndex: row.chunk_index,
            keywords: row.keywords || [],
            score: keywordScore(query, `${row.document_title || ''} ${row.content || ''}`),
            retrievalMode: 'keyword-db',
            cacheHit: false,
          }))
          .filter((chunk: any) => chunk.score > 0);

        results = this.rerankRetrieved(query, candidates, topK);
      } catch (error) {
        console.error('从 Supabase 检索 chunks 失败，回退到 MemoryStore：', error);
      }
    }

    if (!results.length) {
      const visibleDocIds = new Set(this.store.documents.filter((doc) => user.role === 'admin' || doc.visibility === 'public' || doc.ownerId === user.id).map((doc) => doc.id));
      const candidates = this.store.chunks
        .filter((chunk) => visibleDocIds.has(chunk.documentId))
        .map((chunk) => ({
          ...chunk,
          score: keywordScore(query, `${chunk.documentTitle || ''} ${chunk.content}`),
          retrievalMode: 'keyword-memory',
          cacheHit: false,
        }))
        .filter((chunk) => chunk.score > 0);

      results = this.rerankRetrieved(query, candidates, topK);
    }

    return results;
  }

  private detectIntentTitlePatterns(query: string): { patterns: string[]; priority: Record<string, number> } {
    const q = this.normalizeForRerank(query);
    const hasAny = (terms: string[]) => terms.some((term) => q.includes(this.normalizeForRerank(term)));
    const result = { patterns: [] as string[], priority: {} as Record<string, number> };
    const add = (pattern: string, priority: number) => {
      result.patterns.push(pattern);
      result.priority[pattern.replace(/%/g, '').toLowerCase()] = priority;
    };

    const materialIntent = hasAny(['申请材料', '材料清单', '提交哪些材料', '哪些材料', '需要提交', '材料包括', '材料类型', '成绩单', '在读证明', '毕业证', '学位证', '推荐信', '语言成绩', '护照'])
      || (q.includes('材料') && hasAny(['申请', '提交', '准备', '需要', '哪些', '清单', '包括']));
    if (materialIntent) {
      add('%申请材料清单%', 0.82);
      add('%英国硕士申请材料%', 0.82);
      add('%材料清单%', 0.82);
      add('%申请总览%', 0.38);
      add('%CV简历%', 0.2);
      add('%推荐信准备%', 0.2);
      add('%语言成绩%', 0.12);
      return result;
    }

    if (hasAny(['cgpa', 'gpa', '均分', '绩点', '低gpa', '成绩不高'])) {
      add('%CGPA_GPA%', 0.7);
      add('%均分换算%', 0.7);
      add('%马来西亚本科背景%', 0.28);
      add('%选校分层%', 0.18);
      return result;
    }

    if (hasAny(['ps', 'personalstatement', 'personal statement', '个人陈述', '文书怎么写', '文书主线', '低gpa文书'])) {
      add('%Personal_Statement%', 0.7);
      add('%文书写作%', 0.7);
      add('%CV简历%', 0.12);
      return result;
    }

    if (hasAny(['cv', 'resume', '简历'])) {
      add('%CV简历%', 0.72);
      add('%项目作品集%', 0.2);
      add('%申请材料清单%', 0.12);
      return result;
    }

    if (hasAny(['推荐信', '推荐人', '老师推荐', '实习主管'])) {
      add('%推荐信准备%', 0.72);
      add('%申请材料清单%', 0.16);
      return result;
    }

    if (hasAny(['时间线', '什么时候', '申请时间', '网申', '任务拆解'])) {
      add('%申请时间线%', 0.72);
      add('%时间线%', 0.72);
      return result;
    }

    if (hasAny(['预算', '费用', '学费', '生活费', '30万', '城市', '伦敦'])) {
      add('%预算与城市%', 0.72);
      add('%留学预算%', 0.72);
      return result;
    }

    if (hasAny(['rag项目', 'embedding', 'pgvector', '向量检索', 'rag怎么写'])) {
      add('%RAG项目申请素材%', 0.74);
      add('%项目作品集%', 0.16);
      return result;
    }

    if (hasAny(['前端ai', 'ai工作台', 'react项目', 'sse', '前端项目'])) {
      add('%前端AI工作台%', 0.74);
      add('%软件工程与全栈%', 0.16);
      return result;
    }

    if (hasAny(['选校', '定位', '冲刺', '匹配', '保底', '学校推荐', '院校推荐'])) {
      add('%选校分层%', 0.64);
      add('%申请总览%', 0.28);
      add('%马来西亚本科背景%', 0.22);
      return result;
    }

    return result;
  }

  private async retrieveIntentCandidates(query: string, user: RequestUser): Promise<any[]> {
    if (!this.db.enabled) return [];
    const intent = this.detectIntentTitlePatterns(query);
    if (!intent.patterns.length) return [];

    try {
      const result = await this.db.query(
        `
        select
          c.id,
          c.document_id,
          c.document_title,
          c.content,
          c.chunk_index,
          c.keywords,
          coalesce(c.owner_id, d.owner_id, 'u_chris') as owner_id
        from chunks c
        left join documents d on d.id = c.document_id
        where (($1 = 'admin') or coalesce(d.visibility, 'public') = 'public' or coalesce(c.owner_id, d.owner_id, 'u_chris') = $2)
          and d.title ilike any($3::text[])
        order by d.title asc, c.chunk_index asc
        limit 80
        `,
        [user.role, user.id, intent.patterns],
      );

      return result.rows.map((row: any) => {
        const title = String(row.document_title || '').toLowerCase();
        const matched = Object.entries(intent.priority).find(([term]) => title.includes(term));
        return {
          id: row.id,
          documentId: row.document_id,
          documentTitle: row.document_title,
          content: row.content,
          chunkIndex: row.chunk_index,
          keywords: row.keywords || [],
          score: 0,
          keywordSignal: keywordScore(query, `${row.document_title || ''}\n${(row.keywords || []).join(' ')}\n${row.content || ''}`),
          intentPriority: matched ? matched[1] : 0.2,
          retrievalMode: 'pgvector',
          cacheHit: false,
          candidateSource: 'intent-title',
        };
      });
    } catch (error: any) {
      console.error('intent title recall failed, continue without intent candidates:', error?.message || error);
      return [];
    }
  }

  private rerankRetrieved(query: string, candidates: any[], topK: number): any[] {
    const scored = candidates
      .filter((candidate) => this.isSearchableKnowledge(candidate.documentTitle || ''))
      .map((candidate) => {
        const vectorScore = Number(candidate.score || 0);
        const keywordMatchScore = keywordScore(
          query,
          `${candidate.documentTitle || ''}\n${(candidate.keywords || []).join(' ')}\n${candidate.content || ''}`,
        );
        const hybridBoost = this.hybridBoost(query, candidate);
        const keywordSignal = Math.max(keywordMatchScore, Number(candidate.keywordSignal || 0));
        const intentPriority = Number(candidate.intentPriority || 0);
        const score = Math.max(0, Math.min(1, vectorScore * 0.36 + keywordSignal * 0.28 + hybridBoost + intentPriority));

        return {
          ...candidate,
          vectorScore: Number(vectorScore.toFixed(4)),
          keywordScore: Number(keywordSignal.toFixed(4)),
          hybridBoost: Number(hybridBoost.toFixed(4)),
          intentPriority: Number(intentPriority.toFixed(4)),
          score: Number(score.toFixed(4)),
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const deduped: any[] = [];
    const seenDocuments = new Set<string>();

    for (const item of scored) {
      const key = item.documentId || item.documentTitle || item.id;
      if (seenDocuments.has(key)) continue;
      seenDocuments.add(key);
      deduped.push(item);
      if (deduped.length >= topK) break;
    }

    return deduped;
  }

  private isSearchableKnowledge(title: string): boolean {
    const normalized = this.normalizeForRerank(title);
    const blockedPatterns = [
      'readme',
      '使用说明',
      '上传说明',
      '评估问题集',
      'rag评估',
      '评估题',
      '测试问题',
      'eval',
      'do_not_upload',
      'admin_notes',
    ];

    return !blockedPatterns.some((pattern) => normalized.includes(pattern));
  }

  private hybridBoost(query: string, candidate: any): number {
    const q = this.normalizeForRerank(query);
    const title = this.normalizeForRerank(candidate.documentTitle || '');
    const content = this.normalizeForRerank(candidate.content || '').slice(0, 2500);
    const fullText = `${title}\n${content}`;
    let boost = 0;

    const titleHas = (terms: string[]) => this.includesAny(title, terms);
    const queryHas = (terms: string[]) => this.includesAny(q, terms);
    const contentHitCount = (terms: string[]) => terms.filter((term) => fullText.includes(this.normalizeForRerank(term))).length;

    const importantQueryTerms = ['英国', '计算机', '硕士', '申请', '材料', 'gpa', 'cgpa', '均分', 'ps', 'cv', '推荐信', '预算', '选校', '项目'];
    boost += importantQueryTerms.filter((term) => q.includes(term) && title.includes(term)).length * 0.025;

    const isMaterialIntent = queryHas(['申请材料', '材料清单', '提交哪些材料', '哪些材料', '需要提交', '提交什么', '准备哪些', '材料包括', '材料类型', '成绩单', '在读证明', '毕业证', '推荐信', '语言成绩'])
      || (q.includes('材料') && this.includesAny(q, ['申请', '提交', '准备', '需要', '哪些', '清单', '包括']));
    if (isMaterialIntent) {
      if (titleHas(['申请材料清单', '硕士申请材料', '英国硕士申请材料', '材料清单'])) boost += 0.95;
      if (titleHas(['英国计算机硕士申请总览', '申请总览'])) boost += 0.36;
      if (titleHas(['推荐信准备', 'cv简历', 'personalstatement', 'personal_statement', '文书写作'])) boost += 0.16;
      boost += Math.min(0.24, contentHitCount(['成绩单', '在读证明', '毕业证', '学位证', 'personal statement', '个人陈述', '推荐信', '语言成绩', 'cv', 'resume', '护照', '作品集']) * 0.035);
      if (titleHas(['前端ai工作台', 'rag项目申请素材', '项目申请素材', '选校分层', 'offer选择', '预算与城市', '面试', '安全边界'])) boost -= 0.72;
    }

    const isGpaIntent = queryHas(['cgpa', 'gpa', '均分', '绩点', '低gpa', '成绩不高']) && !q.includes('成绩单');
    if (isGpaIntent) {
      if (titleHas(['cgpa', 'gpa', '均分换算', '成绩解释'])) boost += 0.58;
      if (titleHas(['马来西亚本科背景', '英国计算机硕士选校分层'])) boost += 0.16;
      if (titleHas(['前端ai工作台', 'rag项目申请素材'])) boost -= 0.25;
    }

    const isPsIntent = queryHas(['ps', 'personalstatement', 'personal statement', '个人陈述', '文书怎么写', '文书主线', '低gpa文书']);
    if (isPsIntent) {
      if (titleHas(['personalstatement', 'personal_statement', '文书写作指南'])) boost += 0.6;
      if (titleHas(['低gpa', 'cgpa', 'gpa'])) boost += 0.1;
      if (titleHas(['申请材料清单'])) boost -= 0.12;
    }

    const isCvIntent = queryHas(['cv', 'resume', '简历']);
    if (isCvIntent) {
      if (titleHas(['cv简历', '简历与项目包装', 'resume'])) boost += 0.6;
      if (titleHas(['项目作品集', 'github'])) boost += 0.15;
    }

    if (queryHas(['推荐信', '推荐人', '老师推荐', '实习主管'])) {
      if (titleHas(['推荐信准备', '推荐信'])) boost += 0.62;
      if (titleHas(['申请材料清单'])) boost += 0.1;
    }

    if (queryHas(['雅思', '托福', 'pte', '语言成绩', '语言班', '英语成绩'])) {
      if (titleHas(['语言成绩', '语言班', '雅思'])) boost += 0.62;
      if (titleHas(['申请材料清单'])) boost += 0.08;
    }

    if (queryHas(['时间线', '什么时候', '多久', '申请时间', '网申', '截止', '任务拆解'])) {
      if (titleHas(['申请时间线', '任务拆解', '时间线'])) boost += 0.62;
    }

    if (queryHas(['预算', '费用', '学费', '生活费', '30万', '城市', '伦敦'])) {
      if (titleHas(['预算与城市', '留学预算', '城市选择'])) boost += 0.62;
    }

    if (queryHas(['选校', '定位', '冲刺', '匹配', '保底', '学校推荐', '院校推荐'])) {
      if (titleHas(['选校分层', '申请总览', '马来西亚本科背景'])) boost += 0.45;
      if (titleHas(['申请材料清单'])) boost -= 0.12;
    }

    if (queryHas(['专业方向', '选什么专业', 'ai和数据科学', '软件工程和cs', 'cs区别'])) {
      if (titleHas(['专业方向选择', '计算机硕士专业方向'])) boost += 0.62;
    }

    if (queryHas(['马来西亚', 'apu', '海外本科'])) {
      if (titleHas(['马来西亚本科背景', 'cgpa', '英国计算机硕士申请总览'])) boost += 0.32;
    }

    const isRagProjectIntent = queryHas(['rag项目', 'embedding', 'pgvector', '向量检索', 'ai项目怎么写', 'rag怎么写']);
    if (isRagProjectIntent) {
      if (titleHas(['rag项目申请素材'])) boost += 0.65;
      if (titleHas(['ai与数据科学', '项目作品集'])) boost += 0.12;
    }

    const isFrontendProjectIntent = queryHas(['前端ai', 'ai工作台', 'react项目', 'sse', '前端项目']);
    if (isFrontendProjectIntent) {
      if (titleHas(['前端ai工作台项目申请素材'])) boost += 0.65;
      if (titleHas(['软件工程与全栈', '项目作品集'])) boost += 0.12;
    }

    if (queryHas(['作品集', 'github', 'portfolio', '项目包装']) && !isRagProjectIntent && !isFrontendProjectIntent) {
      if (titleHas(['项目作品集', 'github', 'cv简历'])) boost += 0.42;
    }

    if (queryHas(['面试', '口头表达', '申请动机', '项目讲解'])) {
      if (titleHas(['申请面试', '口头表达'])) boost += 0.62;
    }

    if (queryHas(['offer', '录取选择', '最终决策', '多个offer'])) {
      if (titleHas(['offer选择', '最终决策'])) boost += 0.62;
    }

    return boost;
  }

  private normalizeForRerank(text: string): string {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[\-_｜|：:，,。.!！?？「」“”'"`]/g, '');
  }

  private includesAny(text: string, terms: string[]): boolean {
    return terms.some((term) => text.includes(this.normalizeForRerank(term)));
  }

  private async persistConversation(conversationId: string, title: string, user: RequestUser = { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' }) {
    if (!this.db.enabled) return;

    try {
      await this.db.query(
        `
        insert into conversations (id, user_id, title)
        values ($1, $2, $3)
        on conflict (id)
        do update set title = excluded.title, updated_at = now()
        `,
        [conversationId, user.id, title || '新的咨询'],
      );
    } catch (error) {
      console.error('保存 conversation 到 Supabase 失败：', error);
    }
  }

  private async persistMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    sources: any[] = [],
    toolCalls: any[] = [],
  ) {
    if (!this.db.enabled) return;

    try {
      await this.db.query(
        `
        insert into messages (conversation_id, role, content, sources, tool_calls)
        values ($1, $2, $3, $4::jsonb, $5::jsonb)
        `,
        [
          conversationId,
          role,
          content,
          JSON.stringify(sources || []),
          JSON.stringify(toolCalls || []),
        ],
      );
    } catch (error) {
      console.error('保存 message 到 Supabase 失败：', error);
    }
  }

  private async ensureCallLogSchema() {
    if (!this.db.enabled || this.callLogSchemaReady) return;

    try {
      await this.db.query('create extension if not exists "pgcrypto";');
      await this.db.query(`
        create table if not exists call_logs (
          id uuid primary key default gen_random_uuid(),
          conversation_id uuid,
          question text not null default '',
          model text not null default 'unknown',
          success boolean not null default true,
          duration_ms integer not null default 0,
          rag_hit_count integer not null default 0,
          tool_names text[] not null default '{}',
          error text,
          created_at timestamptz not null default now()
        );
      `);
      await this.db.query(`
        alter table if exists call_logs
          add column if not exists request_id text,
          add column if not exists user_id text,
          add column if not exists retrieval_latency_ms integer not null default 0,
          add column if not exists llm_latency_ms integer not null default 0,
          add column if not exists cache_hit boolean not null default false,
          add column if not exists fallback_triggered boolean not null default false,
          add column if not exists fallback_reason text,
          add column if not exists rag_scores jsonb not null default '[]'::jsonb,
          add column if not exists error_type text;
      `);
      this.callLogSchemaReady = true;
    } catch (error) {
      console.error('初始化 call_logs schema 失败：', error);
    }
  }

  private async persistCallLog(payload: {
    requestId: string;
    userId: string;
    conversationId: string;
    question: string;
    model: string;
    success: boolean;
    durationMs: number;
    retrievalLatencyMs: number;
    llmLatencyMs: number;
    ragHitCount: number;
    ragScores: number[];
    cacheHit: boolean;
    fallbackTriggered: boolean;
    fallbackReason?: string;
    toolNames: string[];
    errorType?: string;
    error?: string;
  }) {
    this.store.addCallLog({
      type: 'ai_call',
      conversationId: payload.conversationId,
      question: payload.question,
      model: payload.model,
      success: payload.success,
      status: payload.success ? 'success' : 'failed',
      durationMs: payload.durationMs,
      retrievalLatencyMs: payload.retrievalLatencyMs,
      llmLatencyMs: payload.llmLatencyMs,
      ragHitCount: payload.ragHitCount,
      ragScores: payload.ragScores,
      cacheHit: payload.cacheHit,
      fallbackTriggered: payload.fallbackTriggered,
      fallbackReason: payload.fallbackReason || '',
      toolNames: payload.toolNames,
      errorType: payload.errorType || '',
      error: payload.error || '',
    });

    if (!this.db.enabled) return;

    await this.ensureCallLogSchema();

    try {
      await this.db.query(
        `
        insert into call_logs (
          request_id,
          user_id,
          conversation_id,
          question,
          model,
          success,
          duration_ms,
          retrieval_latency_ms,
          llm_latency_ms,
          rag_hit_count,
          rag_scores,
          cache_hit,
          fallback_triggered,
          fallback_reason,
          tool_names,
          error_type,
          error
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17)
        `,
        [
          payload.requestId,
          payload.userId,
          payload.conversationId,
          payload.question,
          payload.model,
          payload.success,
          payload.durationMs,
          payload.retrievalLatencyMs,
          payload.llmLatencyMs,
          payload.ragHitCount,
          JSON.stringify(payload.ragScores || []),
          payload.cacheHit,
          payload.fallbackTriggered,
          payload.fallbackReason || null,
          payload.toolNames,
          payload.errorType || null,
          payload.error || null,
        ],
      );
    } catch (error) {
      console.error('保存 call_log 到 Supabase 失败：', error);
    }
  }

  private isDemoMode() {
    return !this.llmService.isConfigured() || String(process.env.FORCE_MOCK_CHAT || '').toLowerCase() === 'true';
  }

  private async detectTools(query: string) {
    const calls: any[] = [];
    const lower = query.toLowerCase();

    if (/cgpa|gpa|绩点|均分/.test(lower)) {
      const num = Number((query.match(/\d+(\.\d+)?/) || ['3.2'])[0]);

      calls.push({
        name: 'CGPA 换算工具',
        result: this.tools.convertCgpa({
          cgpa: num,
          scale: 4,
          targetCountry: '英国/澳洲',
        }),
      });
    }

    if (/推荐|学校|院校|university|申请|硕士|master|msc/.test(lower)) {
      calls.push({
        name: '院校推荐工具',
        result: await this.tools.recommendSchools({
          gpa: 3.2,
          country: '英国/澳洲',
          major: '计算机',
          budget: '30万人民币',
        }),
      });
    }

    if (/话术|销售|文案|短视频|沟通/.test(lower)) {
      calls.push({
        name: '销售话术生成工具',
        result: await this.tools.generateCopywriting({
          name: '同学',
          country: '英国',
          concern: '选校和成功率',
        }),
      });
    }

    return calls;
  }

  private buildSourceText(sources: any[]) {
    return sources.length
      ? sources
          .map((s, i) => {
            const title = s.documentTitle || '未命名资料';
            const content = s.content || '';
            return `${i + 1}. ${title}：${content.slice(0, 300)}...`;
          })
          .join('\n')
      : '暂无命中来源。';
  }

  private buildToolText(toolCalls: any[]) {
    return toolCalls.length
      ? toolCalls
          .map((tool, index) => `${index + 1}. ${tool.name}：${JSON.stringify(tool.result, null, 2)}`)
          .join('\n')
      : '暂无工具调用。';
  }

  private fallbackStructured(question: string, sources: any[], toolCalls: any[]): StructuredAdvice {
    const cgpaTool = toolCalls.find((t) => t.name.includes('CGPA'));
    const cgpaText = cgpaTool?.result?.cgpa ? `${cgpaTool.result.cgpa}/4.0` : '待补充';

    return {
      summary: '建议先用 GPA、预算、目标专业和背景项目做初筛，再把院校分为冲刺、匹配、保底三档。',
      profile: {
        education: question.includes('APU') ? 'APU 计算机本科' : '本科背景待补充',
        gpa: cgpaText,
        targetCountry: question.includes('英国') ? '英国' : '目标国家待确认',
        targetMajor: question.includes('计算机') ? '计算机 / 软件工程 / 数据方向' : '目标专业待确认',
        budget: question.includes('30') ? '约 30 万人民币' : '预算待确认',
        competitiveness: '具备申请基础，但需要结合语言成绩、项目经历、实习和课程匹配度进一步判断。',
      },
      schoolTiers: [
        {
          tier: '冲刺',
          level: '录取有挑战，需要强项目和文书支撑',
          strategy: '控制数量，优先选择专业匹配度高、不卡强背景的项目。',
          schools: [
            {
              name: 'Queen Mary University of London',
              reason: '伦敦区位好，计算机相关项目选择较多，适合作为冲刺选择。',
              fit: '适合希望兼顾学校声誉和就业城市资源的申请人。',
              risk: '预算压力较高，且需要注意具体项目是否要求较强数学或编程背景。',
              action: '优先核对项目课程设置、学费和语言要求。',
            },
          ],
        },
        {
          tier: '匹配',
          level: '录取概率相对均衡，是主申请区间',
          strategy: '重点投入文书、推荐信和项目经历包装。',
          schools: [
            {
              name: 'Cardiff University',
              reason: '综合排名和申请难度相对平衡，适合作为核心目标。',
              fit: '适合计算机本科转向软件、数据或信息系统方向。',
              risk: '热门专业可能竞争较高，需要尽早递交。',
              action: '准备课程描述、成绩单、个人陈述和推荐信。',
            },
            {
              name: 'University of Liverpool',
              reason: '计算机相关项目较完整，申请策略上适合作为匹配档。',
              fit: '适合想要稳定申请结果，同时保留学校认可度的学生。',
              risk: '不同项目对课程背景要求不同，要逐个核对。',
              action: '筛选 1 到 2 个最匹配项目，不要盲投。',
            },
          ],
        },
        {
          tier: '保底',
          level: '录取安全性更高，用于控制整体风险',
          strategy: '选择专业匹配、预算压力低、录取门槛相对友好的学校。',
          schools: [
            {
              name: 'University of Sussex',
              reason: '申请门槛相对友好，适合做安全选择。',
              fit: '适合希望稳妥拿 offer 的申请人。',
              risk: '需要评估专业课程是否足够贴近未来就业方向。',
              action: '作为保底之一即可，不建议保底占比过高。',
            },
          ],
        },
      ],
      timeline: [
        { phase: '准备阶段', time: '现在起 2-4 周', tasks: ['确定目标专业', '整理成绩单和课程描述', '准备项目/实习素材'] },
        { phase: '申请阶段', time: '开放申请后 1-2 个月内', tasks: ['优先提交匹配院校', '同步准备冲刺和保底', '检查语言成绩要求'] },
        { phase: '补强阶段', time: '等待 offer 期间', tasks: ['补充作品集或 GitHub 项目', '继续刷语言成绩', '准备面试和奖学金材料'] },
      ],
      risks: ['30 万预算在伦敦可能偏紧。', '仅有 GPA 不足以判断全部录取概率。', '最终要求必须以学校官网当年页面为准。'],
      nextActions: ['补充雅思/托福情况。', '确认是否接受非伦敦城市。', '整理 1-2 个计算机相关项目经历。'],
      disclaimer: '以上建议用于初筛和申请规划，真实申请请以学校官网和当年招生要求为准。',
    };
  }

  private stripCodeFence(text: string) {
    return text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private parseStructuredAnswer(raw: string): StructuredAdvice | null {
    try {
      return JSON.parse(this.stripCodeFence(raw));
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  private structuredToPlainText(structured: StructuredAdvice) {
    const tierText = (structured.schoolTiers || [])
      .map((tier) => {
        const schools = (tier.schools || [])
          .map((school) => `${school.name}：${school.reason}`)
          .join('\n');
        return `${tier.tier}：${tier.strategy}\n${schools}`;
      })
      .join('\n\n');

    const timelineText = (structured.timeline || [])
      .map((item) => `${item.time}｜${item.phase}：${(item.tasks || []).join('；')}`)
      .join('\n');

    return `${structured.summary}\n\n${tierText}\n\n时间规划：\n${timelineText}\n\n下一步：\n${(structured.nextActions || []).join('\n')}\n\n${structured.disclaimer}`;
  }

  private async buildRealAnswer(question: string, sources: any[], toolCalls: any[]) {
    const sourceText = this.buildSourceText(sources);
    const toolText = this.buildToolText(toolCalls);

    const raw = await this.llmService.chat([
      {
        role: 'system',
        content: `你是 EduAgent，一个面向留学咨询场景的 AI Agent 助手。

你必须只返回 JSON，不要返回 Markdown，不要返回星号，不要返回解释性废话，不要使用代码块。

JSON 格式必须严格如下：
{
  "summary": "80到120字的总体判断",
  "profile": {
    "education": "学生背景",
    "gpa": "GPA/CGPA/均分判断",
    "targetCountry": "目标国家",
    "targetMajor": "目标专业方向",
    "budget": "预算判断",
    "competitiveness": "竞争力判断"
  },
  "schoolTiers": [
    {
      "tier": "冲刺",
      "level": "这一档的录取难度",
      "strategy": "这一档的申请策略",
      "schools": [
        {
          "name": "学校名称",
          "reason": "推荐原因，25到45字",
          "fit": "适配点，25到45字",
          "risk": "风险点，25到45字",
          "action": "下一步动作，20到35字"
        }
      ]
    },
    {
      "tier": "匹配",
      "level": "这一档的录取难度",
      "strategy": "这一档的申请策略",
      "schools": []
    },
    {
      "tier": "保底",
      "level": "这一档的录取难度",
      "strategy": "这一档的申请策略",
      "schools": []
    }
  ],
  "timeline": [
    { "phase": "阶段名称", "time": "时间", "tasks": ["任务1", "任务2"] }
  ],
  "risks": ["风险1", "风险2", "风险3"],
  "nextActions": ["下一步1", "下一步2", "下一步3"],
  "disclaimer": "真实申请请以学校官网和当年招生要求为准。"
}

内容要求：
1. 三档选校都必须给出，冲刺、匹配、保底每档各给 2 所学校。
2. 每所学校的 reason、fit、risk、action 每项控制在 25 到 45 字，避免输出过长。
3. 时间规划给 3 个阶段，每个阶段 2 个任务。
4. 语气专业、具体、适合展示在研发项目 Demo 中。
5. 不要编造精确录取率；不确定时用“需要核对官网要求”。
6. 必须返回完整合法 JSON，不要输出 Markdown，不要输出解释。`,
      },
      {
        role: 'user',
        content: `用户问题：
${question}

知识库检索结果：
${sourceText}

系统工具调用结果：
${toolText}

请返回严格 JSON。`,
      },
    ]);

    const structured = this.parseStructuredAnswer(raw);
    return {
      raw,
      structured,
      answer: structured ? this.structuredToPlainText(structured) : raw,
    };
  }

  async ask(body: { conversationId?: string; question: string; topK?: number }, user: RequestUser = { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' }): Promise<any> {
    const requestId = uuid();
    const startedAt = Date.now();

    const question = (body.question || '').slice(
      0,
      Number(process.env.MAX_INPUT_LENGTH || 2000),
    );

    const quota = this.authContext.consumeGuestQuota(user);

    const conv = body.conversationId
      ? this.store.conversations.find((c) => c.id === body.conversationId && (user.role === 'admin' || c.userId === user.id))
      : this.store.createConversation(question.slice(0, 20) || '新的咨询', user.id);

    const conversationId = conv?.id || this.store.createConversation('新的咨询', user.id).id;
    const conversationTitle = conv?.title || question.slice(0, 20) || '新的咨询';

    await this.persistConversation(conversationId, conversationTitle, user);

    this.store.addMessage(conversationId, 'user', question);
    await this.persistMessage(conversationId, 'user', question);

    const retrievalStartedAt = Date.now();
    const sources = await this.retrieve(question, body.topK || 3, user);
    const retrievalLatencyMs = Date.now() - retrievalStartedAt;
    const cacheHit = sources.some((source) => Boolean(source.cacheHit));
    const ragScores = sources.map((source) => Number(source.score || 0));

    const toolCalls = await this.detectTools(question);

    let answer = '';
    let structured: StructuredAdvice | null = null;
    let rawAnswer = '';
    let success = true;
    let errorMessage = '';
    let errorType = '';
    let llmLatencyMs = 0;
    let fallbackTriggered = false;
    let fallbackReason = '';

    if (this.isDemoMode()) {
      fallbackTriggered = true;
      fallbackReason = 'demo_mode_or_missing_llm_key';
      structured = this.fallbackStructured(question, sources, toolCalls);
      answer = this.structuredToPlainText(structured);
      rawAnswer = JSON.stringify(structured, null, 2);
    } else {
      const llmStartedAt = Date.now();
      try {
        const result = await this.buildRealAnswer(question, sources, toolCalls);
        llmLatencyMs = Date.now() - llmStartedAt;
        answer = result.answer;
        structured = result.structured;
        rawAnswer = result.raw;
        if (!structured) {
          fallbackTriggered = true;
          fallbackReason = 'structured_json_parse_failed';
        }
      } catch (error: any) {
        llmLatencyMs = Date.now() - llmStartedAt;
        success = false;
        fallbackTriggered = true;
        fallbackReason = 'llm_call_failed';
        errorType = error?.name || 'LLMError';
        errorMessage = error?.message || String(error);
        answer = `真实大模型调用失败。错误信息：${errorMessage}`;
        rawAnswer = answer;
      }
    }

    this.store.addMessage(conversationId, 'assistant', answer, sources, toolCalls);
    await this.persistMessage(conversationId, 'assistant', answer, sources, toolCalls);

    await this.persistCallLog({
      requestId,
      userId: user.id,
      conversationId,
      question,
      model: process.env.LLM_MODEL || 'deepseek-chat',
      success,
      durationMs: Date.now() - startedAt,
      retrievalLatencyMs,
      llmLatencyMs,
      ragHitCount: sources.length,
      ragScores,
      cacheHit,
      fallbackTriggered,
      fallbackReason,
      toolNames: toolCalls.map((tool) => tool.name),
      errorType,
      error: errorMessage,
    });

    return {
      conversationId,
      answer,
      structured,
      rawAnswer,
      sources,
      toolCalls,
      quota,
      observability: {
        requestId,
        retrievalLatencyMs,
        llmLatencyMs,
        totalLatencyMs: Date.now() - startedAt,
        ragHitCount: sources.length,
        ragScores,
        cacheHit,
        fallbackTriggered,
        fallbackReason,
      },
    };
  }

  async stream(question: string, res: Response, user: RequestUser = { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' }) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (this.isDemoMode()) {
      const result = await this.ask({ question }, user);
      for (const ch of result.answer.split('')) {
        res.write(`data: ${JSON.stringify({ delta: ch })}\n\n`);
        await new Promise((r) => setTimeout(r, 8));
      }
      res.write(`data: ${JSON.stringify({ done: true, sources: result.sources, toolCalls: result.toolCalls, observability: result.observability })}\n\n`);
      res.end();
      return;
    }

    const requestId = uuid();
    const startedAt = Date.now();
    const normalizedQuestion = (question || '请介绍英国硕士申请材料').slice(0, Number(process.env.MAX_INPUT_LENGTH || 2000));
    const quota = this.authContext.consumeGuestQuota(user);
    const conversation = this.store.createConversation(normalizedQuestion.slice(0, 20) || '新的流式咨询', user.id);
    await this.persistConversation(conversation.id, conversation.title, user);
    this.store.addMessage(conversation.id, 'user', normalizedQuestion);
    await this.persistMessage(conversation.id, 'user', normalizedQuestion);

    const retrievalStartedAt = Date.now();
    const sources = await this.retrieve(normalizedQuestion, 3, user);
    const retrievalLatencyMs = Date.now() - retrievalStartedAt;
    const cacheHit = sources.some((source) => Boolean(source.cacheHit));
    const ragScores = sources.map((source) => Number(source.score || 0));
    const toolCalls = await this.detectTools(normalizedQuestion);

    let answer = '';
    let llmLatencyMs = 0;
    let success = true;
    let errorMessage = '';
    let errorType = '';

    try {
      const sourceText = this.buildSourceText(sources);
      const toolText = this.buildToolText(toolCalls);
      const llmStartedAt = Date.now();

      for await (const delta of this.llmService.streamChat([
        {
          role: 'system',
          content: '你是 EduAgent 留学咨询助手。请基于知识库来源和工具结果回答；不确定时说明需以学校官网为准。回答要结构清晰、专业、具体。',
        },
        {
          role: 'user',
          content: `用户问题：\n${normalizedQuestion}\n\n知识库检索结果：\n${sourceText}\n\n工具结果：\n${toolText}`,
        },
      ])) {
        answer += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }

      llmLatencyMs = Date.now() - llmStartedAt;
    } catch (error: any) {
      success = false;
      errorType = error?.name || 'LLMStreamError';
      errorMessage = error?.message || String(error);
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    } finally {
      if (answer) {
        this.store.addMessage(conversation.id, 'assistant', answer, sources, toolCalls);
        await this.persistMessage(conversation.id, 'assistant', answer, sources, toolCalls);
      }

      await this.persistCallLog({
        requestId,
        userId: user.id,
        conversationId: conversation.id,
        question: normalizedQuestion,
        model: process.env.LLM_MODEL || 'deepseek-chat',
        success,
        durationMs: Date.now() - startedAt,
        retrievalLatencyMs,
        llmLatencyMs,
        ragHitCount: sources.length,
        ragScores,
        cacheHit,
        fallbackTriggered: !success,
        fallbackReason: success ? '' : 'stream_failed',
        toolNames: toolCalls.map((tool) => tool.name),
        errorType,
        error: errorMessage,
      });

      res.write(`data: ${JSON.stringify({
        done: true,
        conversationId: conversation.id,
        sources,
        toolCalls,
        quota,
        observability: {
          requestId,
          retrievalLatencyMs,
          llmLatencyMs,
          totalLatencyMs: Date.now() - startedAt,
          ragHitCount: sources.length,
          ragScores,
          cacheHit,
        },
      })}\n\n`);
      res.end();
    }
  }

}
