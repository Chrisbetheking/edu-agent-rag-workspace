import { Injectable } from '@nestjs/common';
import { MemoryStore } from '../../shared/memory-store';
import { DatabaseService } from '../../shared/database.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly store: MemoryStore,
    private readonly db: DatabaseService,
  ) {}

  private toDocument(row: any) {
    return {
      id: row.id,
      title: row.title,
      fileName: row.file_name,
      source: row.source,
      status: row.status,
      createdAt: row.created_at,
      chunkCount: Number(row.chunk_count || 0),
    };
  }

  private toChunk(row: any) {
    return {
      id: row.id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      content: row.content,
      chunkIndex: Number(row.chunk_index || 0),
      keywords: row.keywords || [],
    };
  }

  private async persistDocument(doc: any) {
    if (!this.db.enabled) return;

    try {
      await this.db.query(
        `
        insert into documents (id, title, file_name, source, status, chunk_count, created_at)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id)
        do update set
          title = excluded.title,
          file_name = excluded.file_name,
          source = excluded.source,
          status = excluded.status,
          chunk_count = excluded.chunk_count
        `,
        [
          doc.id,
          doc.title,
          doc.fileName || `${doc.title}.txt`,
          doc.source || 'upload',
          doc.status || 'parsed',
          doc.chunkCount || 0,
          doc.createdAt || new Date().toISOString(),
        ],
      );
    } catch (error) {
      console.error('保存 document 到 Supabase 失败：', error);
    }
  }

  private async persistChunks(documentId: string) {
    if (!this.db.enabled) return;

    const chunks = this.store.chunks.filter((chunk) => chunk.documentId === documentId);

    try {
      await this.db.query('delete from chunks where document_id = $1', [documentId]);

      for (const chunk of chunks) {
        await this.db.query(
          `
          insert into chunks (
            id,
            document_id,
            document_title,
            content,
            chunk_index,
            keywords
          )
          values ($1, $2, $3, $4, $5, $6)
          `,
          [
            chunk.id,
            chunk.documentId,
            chunk.documentTitle,
            chunk.content,
            chunk.chunkIndex,
            chunk.keywords || [],
          ],
        );
      }
    } catch (error) {
      console.error('保存 chunks 到 Supabase 失败：', error);
    }
  }

  private async seedMemoryDocumentsIfNeeded() {
    if (!this.db.enabled) return;

    try {
      const result = await this.db.query('select count(*)::int as count from documents');
      const count = Number(result.rows?.[0]?.count || 0);

      if (count > 0) return;

      for (const doc of this.store.documents) {
        await this.persistDocument(doc);
        await this.persistChunks(doc.id);
      }
    } catch (error) {
      console.error('初始化 Supabase 知识库种子数据失败：', error);
    }
  }

  async list() {
    if (this.db.enabled) {
      try {
        await this.seedMemoryDocumentsIfNeeded();

        const result = await this.db.query(
          `
          select id, title, file_name, source, status, chunk_count, created_at
          from documents
          order by created_at desc
          limit 100
          `,
        );

        return result.rows.map((row: any) => this.toDocument(row));
      } catch (error) {
        console.error('从 Supabase 读取 documents 失败，回退到 MemoryStore：', error);
      }
    }

    return this.store.documents;
  }

  async upload(file: Express.Multer.File, body: any) {
    const title = body?.title || file?.originalname || '未命名文档';
    const text =
      file?.buffer?.toString('utf-8') ||
      body?.text ||
      '这是一个演示文档。后续可以替换为真实 PDF 解析内容。';

    const doc = this.store.addDocumentFromText(
      title,
      file?.originalname || `${title}.txt`,
      text,
      'upload',
    );

    await this.persistDocument(doc);
    await this.persistChunks(doc.id);

    return doc;
  }

  async chunks(documentId: string) {
    if (this.db.enabled) {
      try {
        const result = await this.db.query(
          `
          select id, document_id, document_title, content, chunk_index, keywords, created_at
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

  async reprocess(documentId: string) {
    const doc = this.store.documents.find((d) => d.id === documentId);

    if (doc) {
      doc.status = 'parsed';
      await this.persistDocument(doc);
      await this.persistChunks(doc.id);
      return { message: '重新解析完成', document: doc };
    }

    if (this.db.enabled) {
      try {
        const result = await this.db.query(
          `
          update documents
          set status = 'parsed'
          where id = $1
          returning id, title, file_name, source, status, chunk_count, created_at
          `,
          [documentId],
        );

        if (result.rows.length) {
          return { message: '重新解析完成', document: this.toDocument(result.rows[0]) };
        }
      } catch (error) {
        console.error('重新解析 Supabase document 失败：', error);
      }
    }

    return { message: '文档不存在' };
  }

  async remove(documentId: string) {
    this.store.documents = this.store.documents.filter((d) => d.id !== documentId);
    this.store.chunks = this.store.chunks.filter((c) => c.documentId !== documentId);

    if (this.db.enabled) {
      try {
        await this.db.query('delete from documents where id = $1', [documentId]);
      } catch (error) {
        console.error('删除 Supabase document 失败：', error);
      }
    }

    return { message: '删除成功' };
  }
}
