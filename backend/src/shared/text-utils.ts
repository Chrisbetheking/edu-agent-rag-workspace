import { v4 as uuid } from 'uuid';

export function normalizeText(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export function splitIntoChunks(text: string, chunkSize = 420, overlap = 60) {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const paragraphBreak = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('。'), window.lastIndexOf('；'));
      if (paragraphBreak > chunkSize * 0.48) end = start + paragraphBreak + 1;
    }

    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks.filter(Boolean);
}

const countryTerms = ['英国', '澳洲', '澳大利亚', '新加坡', '香港', '美国', '加拿大', '马来西亚'];

const domainTerms = [
  ...countryTerms,
  '硕士', '本科', '研究生', '计算机', '软件工程', '人工智能', '数据科学', '网络安全',
  '申请材料', '材料', '成绩单', '在读证明', '毕业证', '课程描述', '推荐信', '个人陈述', '简历',
  '语言成绩', '雅思', '托福', 'pte', 'gpa', 'cgpa', '均分', '预算', '项目经历', '实习经历',
  'apu', '冲刺', '匹配', '保底', '选校', '留学', '申请', '文书', '录取',
  '专业方向', '推荐专业', '项目名称', '院校专业', '数据科学', '人工智能', '网络安全', '软件工程',
  'computer science', 'data science', 'artificial intelligence', 'cyber security', 'software engineering',
];

const stopWords = new Set([
  '的', '了', '和', '是', '我', '想', '可以', '需要', '什么', '哪些', '一般', '应该', '如何', '怎么', '吗', '请问',
  'the', 'is', 'and', 'to', 'for', 'with', 'about', 'what', 'how', 'why', 'are', 'you',
]);

function chineseNgrams(text: string) {
  const chineseText = text.replace(/[^\u4e00-\u9fa5]/g, '');
  const grams: string[] = [];

  for (let size = 2; size <= 4; size += 1) {
    for (let i = 0; i <= chineseText.length - size; i += 1) {
      grams.push(chineseText.slice(i, i + size));
    }
  }

  return grams;
}

export function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text).toLowerCase();
  const keywords = new Set<string>();

  const englishTokens = normalized.match(/[a-zA-Z0-9.]+/g) || [];
  englishTokens.forEach((token) => {
    const word = token.trim().toLowerCase();
    if (word.length > 1 && !stopWords.has(word)) keywords.add(word);
  });

  for (const term of domainTerms) {
    const word = term.toLowerCase();
    if (normalized.includes(word) && !stopWords.has(word)) keywords.add(word);
  }

  chineseNgrams(normalized).forEach((word) => {
    if (word.length > 1 && !stopWords.has(word)) keywords.add(word);
  });

  return Array.from(keywords).slice(0, 120);
}

export function keywordScore(query: string, content: string): number {
  const q = extractKeywords(query);
  const c = new Set(extractKeywords(content));
  const contentLower = normalizeText(content).toLowerCase();

  if (!q.length) return 0;

  let weightedHits = 0;
  let totalWeight = 0;

  for (const word of q) {
    const isCountry = countryTerms.map((term) => term.toLowerCase()).includes(word);
    const isDomain = domainTerms.map((term) => term.toLowerCase()).includes(word);
    const weight = isCountry ? 4 : isDomain ? 2 : word.length >= 4 ? 1.2 : 0.55;
    totalWeight += weight;

    if (c.has(word)) weightedHits += weight;
    else if (contentLower.includes(word)) weightedHits += weight * 0.75;
  }

  const mentionedCountries = countryTerms
    .map((term) => term.toLowerCase())
    .filter((term) => normalizeText(query).toLowerCase().includes(term));
  const countryMatched = mentionedCountries.some((term) => contentLower.includes(term));
  const countryPenalty = mentionedCountries.length && !countryMatched ? 0.55 : 1;
  const countryBonus = mentionedCountries.length && countryMatched ? 0.12 : 0;

  const coverage = totalWeight ? (weightedHits / totalWeight) * countryPenalty : 0;
  const exactBonus = contentLower.includes(normalizeText(query).toLowerCase().slice(0, 20)) ? 0.2 : 0;
  return Number(Math.min(1, coverage + countryBonus + exactBonus).toFixed(4));
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
