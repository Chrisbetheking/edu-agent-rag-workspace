import { ForbiddenException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { MemoryStore } from '../../shared/memory-store';
import { DatabaseService } from '../../shared/database.service';
import { DocumentRecord, RequestUser } from '../../shared/types';
import { makeChunk, splitIntoChunks } from '../../shared/text-utils';
import { EmbeddingService } from '../embedding/embedding.service';

interface BulkDocumentInput {
  title?: string;
  fileName?: string;
  text?: string;
  tags?: string[] | string;
}

@Injectable()
export class DocumentsService {
  private schemaReady = false;
  private vectorSchemaReady = false;

  constructor(
    private readonly store: MemoryStore,
    private readonly db: DatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  private defaultUser(): RequestUser {
    return { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' };
  }

  private normalizeTags(tags?: string[] | string) {
    if (Array.isArray(tags)) return tags.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
    return String(tags || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  private canManageDocument(doc: any, user: RequestUser) {
    return user.role === 'admin' || String(doc.ownerId || doc.owner_id || '') === user.id;
  }

  private canReadDocument(doc: any, user: RequestUser) {
    const visibility = doc.visibility || 'public';
    const ownerId = doc.ownerId || doc.owner_id || 'u_chris';
    return user.role === 'admin' || visibility === 'public' || ownerId === user.id;
  }

  private isProfessionalSeedDoc(doc: any) {
    const fileName = String(doc.fileName || doc.file_name || '');
    const title = String(doc.title || '');
    return fileName.startsWith('seed-major-') || /^2[6-8]_/.test(title);
  }

  private withPermissions(doc: any, user: RequestUser) {
    const visibility = doc.visibility || 'public';
    const ownerId = doc.ownerId || 'u_chris';
    return {
      ...doc,
      ownerId,
      visibility,
      ownerLabel: ownerId === user.id ? '我添加的' : ownerId === 'u_chris' ? '系统示例' : '访客资料',
      canDelete: this.canManageDocument({ ...doc, ownerId }, user),
      lockedReason: this.canManageDocument({ ...doc, ownerId }, user) ? '' : '系统示例数据，仅管理员可删除',
    };
  }

  private toDocument(row: any, user: RequestUser = this.defaultUser()) {
    const doc = {
      id: row.id,
      title: row.title,
      fileName: row.file_name,
      source: row.source,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      chunkCount: Number(row.chunk_count || 0),
      ownerId: row.owner_id || 'u_chris',
      visibility: row.visibility || 'public',
      tags: row.tags || [],
    };

    return this.withPermissions(doc, user);
  }

  private toChunk(row: any) {
    return {
      id: row.id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      content: row.content,
      chunkIndex: Number(row.chunk_index || 0),
      keywords: row.keywords || [],
      ownerId: row.owner_id || 'u_chris',
    };
  }

  private async ensureSchema() {
    if (!this.db.enabled) return;

    if (!this.schemaReady) {
      try {
        await this.db.query(`
          alter table if exists documents
            add column if not exists owner_id text not null default 'u_chris',
            add column if not exists visibility text not null default 'public',
            add column if not exists tags text[] not null default '{}',
            add column if not exists updated_at timestamptz not null default now(),
            add column if not exists expires_at timestamptz;
        `);
        await this.db.query(`
          alter table if exists chunks
            add column if not exists owner_id text not null default 'u_chris';
        `);
        this.schemaReady = true;
      } catch (error) {
        console.error('知识库权限字段自动升级失败：', error);
      }
    }

    if (this.embeddingService.isConfigured()) {
      await this.ensureVectorSchema();
    }
  }

  private async ensureVectorSchema() {
    if (!this.db.enabled || this.vectorSchemaReady) return;

    const dimension = this.embeddingService.vectorDimension();

    try {
      await this.db.query('create extension if not exists vector;');
      await this.db.query(`alter table if exists chunks add column if not exists embedding vector(${dimension});`);

      // pgvector ivfflat indexes only support vectors up to 2000 dimensions.
      // SiliconFlow Qwen/Qwen3-Embedding-4B returns 2560 dimensions, so we skip
      // the approximate index for that model and still allow exact vector search.
      // For the current demo-scale knowledge base this is fast enough, and it
      // keeps rebuildEmbeddings available instead of failing schema initialization.
      if (dimension <= 2000) {
        try {
          await this.db.query(`
            create index if not exists idx_chunks_embedding_ivfflat
            on chunks using ivfflat (embedding vector_cosine_ops)
            with (lists = 100);
          `);
        } catch (indexError: any) {
          console.warn('pgvector ivfflat 索引创建失败，继续使用精确向量检索：', indexError?.message || indexError);
        }
      } else {
        console.warn(`Embedding 维度 ${dimension} 超过 ivfflat 2000 维限制，跳过索引，使用精确向量检索。`);
      }

      this.vectorSchemaReady = true;
    } catch (error: any) {
      console.error('pgvector schema 初始化失败，当前仍可使用 keyword RAG：', error?.message || error);
    }
  }

  private async buildChunkEmbedding(content: string) {
    if (!this.embeddingService.isConfigured()) return null;

    try {
      return await this.embeddingService.embed(content);
    } catch (error: any) {
      console.error('chunk embedding 生成失败，跳过该 chunk 向量：', error?.message || error);
      return null;
    }
  }

  private async persistDocument(doc: DocumentRecord) {
    if (!this.db.enabled) return;

    await this.ensureSchema();

    try {
      await this.db.query(
        `
        insert into documents (
          id, title, file_name, source, status, chunk_count, created_at, updated_at, owner_id, visibility, tags
        )
        values ($1, $2, $3, $4, $5, $6, $7, now(), $8, $9, $10)
        on conflict (id)
        do update set
          title = excluded.title,
          file_name = excluded.file_name,
          source = excluded.source,
          status = excluded.status,
          chunk_count = excluded.chunk_count,
          updated_at = now(),
          owner_id = excluded.owner_id,
          visibility = excluded.visibility,
          tags = excluded.tags
        `,
        [
          doc.id,
          doc.title,
          doc.fileName || `${doc.title}.txt`,
          doc.source || 'upload',
          doc.status || 'parsed',
          doc.chunkCount || 0,
          doc.createdAt || new Date().toISOString(),
          doc.ownerId || 'u_chris',
          doc.visibility || 'public',
          doc.tags || [],
        ],
      );
    } catch (error) {
      console.error('保存 document 到 Supabase 失败：', error);
    }
  }

  private async persistChunks(documentId: string) {
    if (!this.db.enabled) return;

    await this.ensureSchema();

    const chunks = this.store.chunks.filter((chunk) => chunk.documentId === documentId);
    const canPersistEmbedding = this.vectorSchemaReady && this.embeddingService.isConfigured();

    try {
      await this.db.query('delete from chunks where document_id = $1', [documentId]);

      for (const chunk of chunks) {
        if (canPersistEmbedding) {
          const embedding = await this.buildChunkEmbedding(chunk.content);
          await this.db.query(
            `
            insert into chunks (
              id,
              document_id,
              document_title,
              content,
              chunk_index,
              keywords,
              owner_id,
              embedding
            )
            values ($1, $2, $3, $4, $5, $6, $7, case when $8::text is null then null else $8::vector end)
            `,
            [
              chunk.id,
              chunk.documentId,
              chunk.documentTitle,
              chunk.content,
              chunk.chunkIndex,
              chunk.keywords || [],
              chunk.ownerId || 'u_chris',
              embedding ? this.embeddingService.toSqlVector(embedding) : null,
            ],
          );
          continue;
        }

        await this.db.query(
          `
          insert into chunks (
            id,
            document_id,
            document_title,
            content,
            chunk_index,
            keywords,
            owner_id
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            chunk.id,
            chunk.documentId,
            chunk.documentTitle,
            chunk.content,
            chunk.chunkIndex,
            chunk.keywords || [],
            chunk.ownerId || 'u_chris',
          ],
        );
      }
    } catch (error) {
      console.error('保存 chunks 到 Supabase 失败：', error);
    }
  }

  private createDocumentFromText(input: {
    title: string;
    fileName?: string;
    text: string;
    source?: string;
    mode?: 'auto' | 'chunks';
    user?: RequestUser;
    tags?: string[];
  }) {
    const user = input.user || this.defaultUser();
    const now = new Date().toISOString();
    const ownerId = user.id;
    const visibility = user.role === 'admin' ? 'public' : 'guest';
    const rawText = String(input.text || '').trim();
    const chunksText = input.mode === 'chunks'
      ? rawText.split(/---chunk---|---CHUNK---|\n\s*#{3,}\s*\n/g).map((item) => item.trim()).filter(Boolean)
      : splitIntoChunks(rawText);

    const doc: DocumentRecord = {
      id: uuid(),
      title: input.title || input.fileName || '未命名文档',
      fileName: input.fileName || `${input.title || 'document'}.txt`,
      source: input.source || 'upload',
      status: 'parsed',
      createdAt: now,
      updatedAt: now,
      chunkCount: chunksText.length,
      ownerId,
      visibility,
      tags: input.tags || [],
    };

    const chunks = chunksText.map((chunk, index) => ({
      ...makeChunk(doc.id, doc.title, chunk, index),
      ownerId,
    }));

    this.store.documents.unshift(doc);
    this.store.chunks.push(...chunks);
    return doc;
  }

  private async seedMemoryDocumentsIfNeeded() {
    if (!this.db.enabled) return;

    await this.ensureSchema();

    try {
      const result = await this.db.query('select count(*)::int as count from documents');
      const count = Number(result.rows?.[0]?.count || 0);

      if (count === 0) {
        for (const doc of this.store.documents) {
          await this.persistDocument(doc);
          await this.persistChunks(doc.id);
        }
        return;
      }

      // 线上库已经有旧资料时，也补齐新增的“专业细分/院校专业/成功率排序”系统资料。
      // 这样部署新版本后，不需要手动上传，知识库会自动变得更细到具体专业。
      const professionalSeeds = this.store.documents.filter((doc) => this.isProfessionalSeedDoc(doc));
      if (!professionalSeeds.length) return;

      const seedFileNames = professionalSeeds.map((doc) => doc.fileName || `${doc.title}.txt`);
      const existing = await this.db.query(
        'select file_name from documents where file_name = any($1::text[])',
        [seedFileNames],
      );
      const existingNames = new Set((existing.rows || []).map((row: any) => row.file_name));

      for (const doc of professionalSeeds) {
        const fileName = doc.fileName || `${doc.title}.txt`;
        if (existingNames.has(fileName)) continue;
        await this.persistDocument(doc);
        await this.persistChunks(doc.id);
      }
    } catch (error) {
      console.error('初始化 Supabase 知识库种子数据失败：', error);
    }
  }

  async list(user: RequestUser = this.defaultUser()) {
    if (this.db.enabled) {
      try {
        await this.seedMemoryDocumentsIfNeeded();

        const result = await this.db.query(
          `
          select id, title, file_name, source, status, chunk_count, created_at, updated_at, owner_id, visibility, tags
          from documents
          where ($1 = 'admin') or visibility = 'public' or owner_id = $2
          order by created_at desc
          limit 150
          `,
          [user.role, user.id],
        );

        return result.rows.map((row: any) => this.toDocument(row, user));
      } catch (error) {
        console.error('从 Supabase 读取 documents 失败，回退到 MemoryStore：', error);
      }
    }

    return this.store.documents
      .filter((doc) => this.canReadDocument(doc, user))
      .map((doc) => this.withPermissions(doc, user));
  }

  async stats(user: RequestUser = this.defaultUser()) {
    const documents = await this.list(user);
    const totalDocuments = documents.length;
    const totalChunks = documents.reduce((sum: number, doc: any) => sum + Number(doc.chunkCount || 0), 0);
    const ownedDocuments = documents.filter((doc: any) => doc.ownerId === user.id).length;
    const statusMap = new Map<string, number>();

    for (const doc of documents as any[]) {
      const status = doc.status || 'unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }

    return {
      totalDocuments,
      totalChunks,
      ownedDocuments,
      parsedDocuments: statusMap.get('parsed') || 0,
      pendingDocuments: statusMap.get('pending') || 0,
      statusBreakdown: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      recentDocuments: documents.slice(0, 6),
      generatedAt: new Date().toISOString(),
    };
  }

  async upload(file: Express.Multer.File, body: any, user: RequestUser = this.defaultUser()) {
    const title = body?.title || file?.originalname || '未命名文档';
    const text =
      file?.buffer?.toString('utf-8') ||
      body?.text ||
      '这是一个演示文档。后续可以替换为真实 PDF 解析内容。';

    const doc = this.createDocumentFromText({
      title,
      fileName: file?.originalname || `${title}.txt`,
      text,
      source: user.role === 'guest' ? 'guest-upload' : 'upload',
      mode: body?.mode === 'chunks' ? 'chunks' : 'auto',
      user,
      tags: this.normalizeTags(body?.tags),
    });

    await this.persistDocument(doc);
    await this.persistChunks(doc.id);

    return this.withPermissions(doc, user);
  }

  async bulk(body: { mode?: 'auto' | 'chunks'; documents?: BulkDocumentInput[] }, user: RequestUser = this.defaultUser()) {
    const docs = Array.isArray(body?.documents) ? body.documents : [];
    const created: any[] = [];

    for (const item of docs.slice(0, 30)) {
      const text = String(item.text || '').trim();
      if (!text) continue;

      const title = item.title || item.fileName || `导入资料 ${created.length + 1}`;
      const doc = this.createDocumentFromText({
        title,
        fileName: item.fileName || `${title}.txt`,
        text,
        source: user.role === 'guest' ? 'guest-bulk' : 'bulk-import',
        mode: body.mode === 'chunks' ? 'chunks' : 'auto',
        user,
        tags: this.normalizeTags(item.tags),
      });

      await this.persistDocument(doc);
      await this.persistChunks(doc.id);
      created.push(this.withPermissions(doc, user));
    }

    return {
      count: created.length,
      totalChunks: created.reduce((sum, doc) => sum + Number(doc.chunkCount || 0), 0),
      documents: created,
    };
  }

  async rebuildEmbeddings(user: RequestUser = this.defaultUser()) {
    if (!this.db.enabled) {
      return { message: 'DATABASE_URL 未配置，当前仅使用内存知识库，无法写入 pgvector。', updated: 0 };
    }

    if (!this.embeddingService.isConfigured()) {
      return { message: 'Embedding 未配置。请先配置 EMBEDDING_API_KEY、EMBEDDING_BASE_URL、EMBEDDING_MODEL。', updated: 0 };
    }

    await this.ensureSchema();

    if (!this.vectorSchemaReady) {
      return { message: 'pgvector schema 未初始化成功。请确认 Supabase 已启用 vector 扩展并执行 docs/supabase-full-schema.sql。', updated: 0 };
    }

    const limit = Math.min(Number(process.env.EMBEDDING_REINDEX_LIMIT || 200), 1000);
    const result = await this.db.query(
      `
      select c.id, c.content
      from chunks c
      left join documents d on d.id = c.document_id
      where c.embedding is null
        and (($1 = 'admin') or coalesce(d.visibility, 'public') = 'public' or coalesce(c.owner_id, d.owner_id, 'u_chris') = $2)
      order by c.created_at desc
      limit $3
      `,
      [user.role, user.id, limit],
    );

    let updated = 0;
    const failed: string[] = [];

    for (const row of result.rows) {
      try {
        const embedding = await this.embeddingService.embed(row.content || '');
        await this.db.query('update chunks set embedding = $2::vector where id = $1', [row.id, this.embeddingService.toSqlVector(embedding)]);
        updated += 1;
      } catch (error: any) {
        failed.push(`${row.id}: ${error?.message || error}`);
      }
    }

    return {
      message: 'Embedding 重建完成',
      model: this.embeddingService.modelName(),
      dimension: this.embeddingService.vectorDimension(),
      scanned: result.rows.length,
      updated,
      failedCount: failed.length,
      failed: failed.slice(0, 5),
    };
  }

  async chunks(documentId: string, user: RequestUser = this.defaultUser()) {
    const visible = await this.list(user);
    const doc = visible.find((item: any) => item.id === documentId);
    if (!doc) throw new ForbiddenException('没有权限查看该文档切片');

    if (this.db.enabled) {
      try {
        await this.ensureSchema();
        const result = await this.db.query(
          `
          select id, document_id, document_title, content, chunk_index, keywords, owner_id, created_at
          from chunks
          where document_id = $1
          order by chunk_index asc
          `,
          [documentId],
        );

        return result.rows.map((row: any) => this.toChunk(row));
      } catch (error) {
        console.error('从 Supabase 读取 chunks 失败，回退到 MemoryStore：', error);
      }
    }

    return this.store.chunks.filter((c) => c.documentId === documentId);
  }

  async reprocess(documentId: string, user: RequestUser = this.defaultUser()) {
    const doc = this.store.documents.find((d) => d.id === documentId);

    if (doc) {
      if (!this.canManageDocument(doc, user)) throw new ForbiddenException('访客只能重新处理自己添加的文档');
      doc.status = 'parsed';
      doc.updatedAt = new Date().toISOString();
      await this.persistDocument(doc);
      await this.persistChunks(doc.id);
      return { message: '重新解析完成', document: this.withPermissions(doc, user) };
    }

    if (this.db.enabled) {
      try {
        await this.ensureSchema();
        const old = await this.db.query('select owner_id, visibility from documents where id = $1', [documentId]);
        if (!old.rows.length) return { message: '文档不存在' };
        if (!this.canManageDocument(old.rows[0], user)) throw new ForbiddenException('访客只能重新处理自己添加的文档');

        const result = await this.db.query(
          `
          update documents
          set status = 'parsed', updated_at = now()
          where id = $1
          returning id, title, file_name, source, status, chunk_count, created_at, updated_at, owner_id, visibility, tags
          `,
          [documentId],
        );

        if (result.rows.length) {
          return { message: '重新解析完成', document: this.toDocument(result.rows[0], user) };
        }
      } catch (error) {
        if (error instanceof ForbiddenException) throw error;
        console.error('重新解析 Supabase document 失败：', error);
      }
    }

    return { message: '文档不存在' };
  }

  async remove(documentId: string, user: RequestUser = this.defaultUser()) {
    const memDoc = this.store.documents.find((d) => d.id === documentId);
    if (memDoc && !this.canManageDocument(memDoc, user)) {
      throw new ForbiddenException('系统示例数据受保护，访客只能删除自己新增的资料');
    }

    if (this.db.enabled) {
      try {
        await this.ensureSchema();
        const old = await this.db.query('select owner_id, visibility from documents where id = $1', [documentId]);
        if (old.rows.length && !this.canManageDocument(old.rows[0], user)) {
          throw new ForbiddenException('系统示例数据受保护，访客只能删除自己新增的资料');
        }
        await this.db.query('delete from documents where id = $1', [documentId]);
      } catch (error) {
        if (error instanceof ForbiddenException) throw error;
        console.error('删除 Supabase document 失败：', error);
      }
    }

    this.store.documents = this.store.documents.filter((d) => d.id !== documentId);
    this.store.chunks = this.store.chunks.filter((c) => c.documentId !== documentId);

    return { message: '删除成功' };
  }
}
