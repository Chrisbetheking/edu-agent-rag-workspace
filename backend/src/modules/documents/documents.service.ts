import { Injectable } from '@nestjs/common';
import { MemoryStore } from '../../shared/memory-store';

@Injectable()
export class DocumentsService {
  constructor(private readonly store: MemoryStore) {}

  list() {
    return this.store.documents;
  }

  upload(file: Express.Multer.File, body: any) {
    const title = body?.title || file?.originalname || '未命名文档';
    const text = file?.buffer?.toString('utf-8') || body?.text || '这是一个演示文档。后续可以替换为真实 PDF 解析内容。';
    return this.store.addDocumentFromText(title, file?.originalname || `${title}.txt`, text, 'upload');
  }

  chunks(documentId: string) {
    return this.store.chunks.filter((c) => c.documentId === documentId);
  }

  reprocess(documentId: string) {
    const doc = this.store.documents.find((d) => d.id === documentId);
    if (!doc) return { message: '文档不存在' };
    doc.status = 'parsed';
    return { message: '重新解析完成', document: doc };
  }

  remove(documentId: string) {
    this.store.documents = this.store.documents.filter((d) => d.id !== documentId);
    this.store.chunks = this.store.chunks.filter((c) => c.documentId !== documentId);
    return { message: '删除成功' };
  }
}
