import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

type ImportMode = 'auto' | 'chunks' | 'files';

type DocumentItem = {
  id: string;
  title: string;
  fileName?: string;
  status?: string;
  chunkCount?: number;
  createdAt?: string;
  ownerId?: string;
  ownerLabel?: string;
  visibility?: string;
  canDelete?: boolean;
  lockedReason?: string;
  tags?: string[];
};

type ChunkItem = {
  id: string;
  documentTitle?: string;
  content: string;
  chunkIndex: number;
  keywords?: string[];
};

type FileDraft = { title: string; fileName: string; text: string; tags?: string[] };

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function estimateChunks(text: string, mode: ImportMode) {
  const raw = String(text || '').trim();
  if (!raw) return 0;
  if (mode === 'chunks') return raw.split(/---chunk---|---CHUNK---|\n\s*#{3,}\s*\n/g).filter((x) => x.trim()).length;
  return Math.max(1, Math.ceil(raw.length / 650));
}

export default function Knowledge() {
  const user = useAuthStore((s) => s.user);
  const isGuest = user?.role === 'guest';
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [mode, setMode] = useState<ImportMode>('auto');
  const [title, setTitle] = useState('马来西亚本科背景申请英国计算机硕士建议');
  const [text, setText] = useState('马来西亚计算机本科学生申请英国计算机硕士时，学校通常关注本科课程匹配度、CGPA、语言成绩、项目经历、实习经历和预算。CGPA 3.2/4.0 可重点考虑匹配院校，同时用项目、GitHub、实习和推荐信强化申请材料。');
  const [tags, setTags] = useState('英国,计算机,案例');
  const [fileDrafts, setFileDrafts] = useState<FileDraft[]>([]);
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const { data } = await api.get('/documents');
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '加载知识库失败');
    }
  }

  useEffect(() => { load(); }, []);

  async function add(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const payload = mode === 'files'
        ? { mode: 'auto', documents: fileDrafts }
        : { mode, documents: [{ title, fileName: `${title}.txt`, text, tags }] };

      if (!payload.documents.length || !payload.documents.some((doc: any) => String(doc.text || '').trim())) {
        setError('请先填写正文或选择文件。');
        setLoading(false);
        return;
      }

      const { data } = await api.post('/documents/bulk', payload);
      setNotice(`导入成功：${data.count} 个文档，${data.totalChunks} 个 chunks 已写入 Supabase。`);
      if (mode !== 'files') setText('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '导入文档失败');
    } finally {
      setLoading(false);
    }
  }

  async function parseFiles(files: FileList | null) {
    if (!files?.length) return;
    const allowed = ['.txt', '.md', '.json', '.csv'];
    const selected = Array.from(files).slice(0, 20);
    const parsed: FileDraft[] = [];

    for (const file of selected) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowed.includes(ext)) continue;
      const content = await file.text();
      parsed.push({ title: file.name.replace(/\.[^.]+$/, ''), fileName: file.name, text: content, tags: tags.split(',').map((x) => x.trim()).filter(Boolean) });
    }

    setFileDrafts(parsed);
    setMode('files');
  }

  async function viewChunks(doc: DocumentItem) {
    setSelectedDoc(doc);
    setChunks([]);
    const { data } = await api.get(`/documents/${doc.id}/chunks`);
    setChunks(Array.isArray(data) ? data : []);
  }

  async function remove(doc: DocumentItem) {
    if (!doc.canDelete) {
      setError(doc.lockedReason || '没有权限删除该文档。');
      return;
    }
    await api.delete(`/documents/${doc.id}`);
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(null);
      setChunks([]);
    }
    await load();
  }

  const stats = useMemo(() => ({
    docs: documents.length,
    chunks: documents.reduce((sum, doc) => sum + Number(doc.chunkCount || 0), 0),
    parsed: documents.filter((doc) => doc.status === 'parsed').length,
    mine: documents.filter((doc) => doc.ownerId === user?.id).length,
  }), [documents, user?.id]);

  const importCount = mode === 'files'
    ? fileDrafts.length
    : 1;
  const chunkEstimate = mode === 'files'
    ? fileDrafts.reduce((sum, doc) => sum + estimateChunks(doc.text, 'auto'), 0)
    : estimateChunks(text, mode);

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">RAG Knowledge Operations</span>
          <h1>知识库管理</h1>
          <p>支持整篇资料自动切片、预切片导入、多文件批量导入；访客只能删除自己添加的资料，系统示例数据受保护。</p>
        </div>
        <div className="title-actions">
          <span className="status-dot">{stats.parsed}/{stats.docs} parsed</span>
          <button className="ghost-button" onClick={load}>刷新</button>
        </div>
      </div>

      <div className="stats-grid four">
        <div className="stat-card"><span>文档数</span><strong>{stats.docs}</strong><p>visible documents</p></div>
        <div className="stat-card"><span>切片数</span><strong>{stats.chunks}</strong><p>retrievable chunks</p></div>
        <div className="stat-card"><span>已解析</span><strong>{stats.parsed}</strong><p>ready for RAG</p></div>
        <div className="stat-card"><span>我添加的</span><strong>{stats.mine}</strong><p>{isGuest ? 'guest sandbox' : 'admin assets'}</p></div>
      </div>

      {isGuest && <div className="permission-banner">访客模式：你可以查看系统示例知识库，也可以新增测试资料；但只能删除自己新增的资料，不能破坏原始 Demo 数据。</div>}
      {error && <div className="error-card"><strong>操作失败</strong><p>{error}</p></div>}
      {notice && <div className="success-card"><strong>完成</strong><p>{notice}</p></div>}

      <div className="two-col wide-right knowledge-layout">
        <section className="panel form-panel import-center">
          <div className="panel-title compact"><span className="eyebrow">Import Center</span><h2>批量导入 / 自动切片</h2></div>
          <div className="import-tabs">
            <button type="button" className={mode === 'auto' ? 'active' : ''} onClick={() => setMode('auto')}>整篇自动切片</button>
            <button type="button" className={mode === 'chunks' ? 'active' : ''} onClick={() => setMode('chunks')}>已有切片导入</button>
            <button type="button" className={mode === 'files' ? 'active' : ''} onClick={() => setMode('files')}>多文件上传</button>
          </div>

          <form onSubmit={add} className="form-stack">
            {mode !== 'files' ? (
              <>
                <label>文档标题<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：英国硕士申请 FAQ" /></label>
                <label>标签<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="英国,计算机,申请材料" /></label>
                <label>{mode === 'chunks' ? '切片正文（用 ---chunk--- 分隔）' : '文档正文'}<textarea className="large-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴 FAQ、院校要求、案例、材料清单..." /></label>
              </>
            ) : (
              <div className="file-upload-zone">
                <input type="file" multiple accept=".txt,.md,.json,.csv" onChange={(e) => parseFiles(e.target.files)} />
                <strong>选择 .txt / .md / .json / .csv 文件</strong>
                <span>最多一次 20 个文件，前端先解析文本，再批量写入 Supabase。</span>
                <div className="file-chip-row">
                  {fileDrafts.map((file) => <em key={file.fileName}>{file.fileName}</em>)}
                </div>
              </div>
            )}

            <div className="import-preview">
              <div><span>待导入文档</span><strong>{importCount}</strong></div>
              <div><span>预计切片</span><strong>{chunkEstimate}</strong></div>
              <div><span>Owner</span><strong>{isGuest ? 'guest sandbox' : 'system public'}</strong></div>
            </div>

            <button className="primary" disabled={loading}>{loading ? '写入 Supabase 中...' : '导入并写入 Supabase'}</button>
          </form>
          <div className="hint-card">向量库升级后，这些 chunks 可以继续生成 embedding，写入 Supabase pgvector，用于语义检索。</div>
        </section>

        <section className="panel document-panel">
          <div className="panel-title">
            <div><span className="eyebrow">Documents</span><h2>文档列表</h2></div>
            <span className="pill muted">{documents.length} records</span>
          </div>
          {documents.length === 0 ? (
            <div className="empty-mini">暂无文档。导入一条资料后，AI 对话会自动检索。</div>
          ) : documents.map((doc) => (
            <article className={selectedDoc?.id === doc.id ? 'document-row-v2 active' : 'document-row-v2'} key={doc.id}>
              <div className="doc-main">
                <div className="doc-title-line">
                  <strong>{doc.title}</strong>
                  <span className={doc.ownerId === user?.id ? 'owner-badge mine' : 'owner-badge'}>{doc.ownerLabel || '系统示例'}</span>
                </div>
                <span>{doc.fileName || 'manual text'} · {doc.status || 'parsed'} · {formatDate(doc.createdAt)}</span>
                {!!doc.tags?.length && <div className="tag-row">{doc.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>}
              </div>
              <div className="doc-actions">
                <button className="chunk-pill" onClick={() => viewChunks(doc)}>{doc.chunkCount || 0} chunks</button>
                <button className="ghost-button" onClick={() => viewChunks(doc)}>查看切片</button>
                <button className={doc.canDelete ? 'danger-button' : 'locked-button'} onClick={() => remove(doc)}>{doc.canDelete ? '删除' : '锁定'}</button>
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
                <div className="chunk-index">chunk #{chunk.chunkIndex + 1}</div>
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
