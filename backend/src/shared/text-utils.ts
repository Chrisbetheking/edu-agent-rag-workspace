import { v4 as uuid } from 'uuid';

export function normalizeText(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export function splitIntoChunks(text: string, chunkSize = 420, overlap = 60) {
  const normalized = normalizeText(text);
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text).toLowerCase();
  const words = normalized.match(/[a-zA-Z0-9\u4e00-\u9fa5]+/g) || [];
  const stop = new Set(['的', '了', '和', '是', '我', '想', '可以', '申请', '需要', '什么', '吗', 'the', 'is', 'and', 'to', 'for']);
  return Array.from(new Set(words.filter((w) => w.length > 1 && !stop.has(w)))).slice(0, 30);
}

export function keywordScore(query: string, content: string): number {
  const q = extractKeywords(query);
  const c = new Set(extractKeywords(content));
  if (!q.length) return 0;
  const hit = q.filter((word) => c.has(word)).length;
  const partial = q.filter((word) => content.toLowerCase().includes(word)).length;
  return Number(((hit * 1.2 + partial * 0.6) / q.length).toFixed(4));
}

export function makeChunk(documentId: string, documentTitle: string, content: string, chunkIndex: number) {
  return {
    id: uuid(),
    documentId,
    documentTitle,
    content,
    chunkIndex,
    keywords: extractKeywords(content),
  };
}
