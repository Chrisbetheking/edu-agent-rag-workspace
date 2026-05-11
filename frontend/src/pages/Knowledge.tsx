import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type DocumentItem = {
  id: string;
  title: string;
  fileName?: string;
  status?: string;
  chunkCount?: number;
  createdAt?: string;
};

type ChunkItem = {
  id: string;
  documentTitle?: string;
  content: string;
  chunkIndex: number;
  keywords?: string[];
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function Knowledge() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [title, setTitle] = useState('马来西亚本科背景申请英国计算机硕士建议');
  const [text, setText] = useState('马来西亚计算机本科学生申请英国计算机硕士时，学校通常关注本科课程匹配度、CGPA、语言成绩、项目经历、实习经历和预算。CGPA 3.2/4.0 可重点考虑匹配院校，同时用项目、GitHub、实习和推荐信强化申请材料。');
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const { data } = await api.get('/documents');
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '加载知识库失败');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      setError('标题和正文不能为空。');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('text', text);
      await api.post('/documents/upload', form);
      setText('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '上传文档失败');
    } finally {
      setLoading(false);
    }
  }

  async function viewChunks(doc: DocumentItem) {
    setSelectedDoc(doc);
    setChunks([]);
    const { data } = await api.get(`/documents/${doc.id}/chunks`);
    setChunks(Array.isArray(data) ? data : []);
  }

  async function remove(id: string) {
    await api.delete(`/documents/${id}`);
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
      setChunks([]);
    }
    await load();
  }

  const stats = useMemo(() => ({
    docs: documents.length,
    chunks: documents.reduce((sum, doc) => sum + Number(doc.chunkCount || 0), 0),
    parsed: documents.filter((doc) => doc.status === 'parsed').length,
  }), [documents]);

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">RAG Knowledge Operations</span>
          <h1>知识库管理</h1>
          <p>把留学资料沉淀成可检索 chunks，让 AI 回答有来源、可追溯、可维护。</p>
        </div>
        <div className="title-actions">
          <span className="status-dot">{stats.parsed}/{stats.docs} parsed</span>
          <button className="ghost-button" onClick={load}>刷新</button>
        </div>
      </div>

      <div className="stats-grid three">
        <div className="stat-card"><span>文档数</span><strong>{stats.docs}</strong><p>documents table</p></div>
        <div className="stat-card"><span>切片数</span><strong>{stats.chunks}</strong><p>chunks table</p></div>
        <div className="stat-card"><span>已解析</span><strong>{stats.parsed}</strong><p>用于 RAG 检索</p></div>
      </div>

      {error && <div className="error-card"><strong>操作失败</strong><p>{error}</p></div>}

      <div className="two-col wide-right">
        <section className="panel form-panel">
          <div className="panel-title compact"><span className="eyebrow">Upload</span><h2>新增文档</h2></div>
          <form onSubmit={add} className="form-stack">
            <label>文档标题<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：英国硕士申请 FAQ" /></label>
            <label>文档正文<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴留学申请政策、FAQ、案例或院校说明..." /></label>
            <button className="primary" disabled={loading}>{loading ? '上传切片中...' : '上传并自动切片'}</button>
          </form>
          <div className="hint-card">建议放入 FAQ、院校要求、申请案例和材料清单。Demo 时可现场新增一条资料，再去 AI 对话页验证 RAG 命中。</div>
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Documents</span><h2>文档列表</h2></div>
          {documents.length === 0 ? (
            <div className="empty-mini">暂无文档。新增一条知识库后，AI 对话会自动检索。</div>
          ) : documents.map((doc) => (
            <article className={selectedDoc?.id === doc.id ? 'document-row active' : 'document-row'} key={doc.id}>
              <div>
                <strong>{doc.title}</strong>
                <span>{doc.fileName || 'manual text'} · {doc.status || 'parsed'} · {formatDate(doc.createdAt)}</span>
              </div>
              <div className="actions">
                <em>{doc.chunkCount || 0} chunks</em>
                <button onClick={() => viewChunks(doc)}>查看切片</button>
                <button className="danger-button" onClick={() => remove(doc.id)}>删除</button>
              </div>
            </article>
          ))}
        </section>
      </div>

      <section className="panel">
        <div className="panel-title compact"><span className="eyebrow">Chunks Preview</span><h2>{selectedDoc ? selectedDoc.title : '文档切片预览'}</h2></div>
        {chunks.length === 0 ? (
          <div className="empty-mini">选择一个文档查看切片内容、chunk index 和关键词。</div>
        ) : (
          <div className="chunk-grid">
            {chunks.map((chunk) => (
              <article className="chunk-card" key={chunk.id}>
                <div className="chunk-index">#{chunk.chunkIndex}</div>
                <p>{chunk.content}</p>
                {!!chunk.keywords?.length && <div className="tag-row">{chunk.keywords.slice(0, 6).map((keyword) => <span key={keyword}>{keyword}</span>)}</div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
