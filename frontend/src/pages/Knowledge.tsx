import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Knowledge() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [title, setTitle] = useState('新加坡计算机硕士申请 FAQ');
  const [text, setText] = useState('新加坡计算机硕士通常关注本科背景、GPA、语言成绩、项目经历和推荐信。部分学校要求较强的数学和编程基础。');
  const [chunks, setChunks] = useState<any[]>([]);

  function load() { api.get('/documents').then((res) => setDocuments(res.data)); }
  useEffect(load, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const form = new FormData();
    form.append('title', title);
    form.append('text', text);
    await api.post('/documents/upload', form);
    setText('');
    load();
  }

  async function viewChunks(id: string) {
    const { data } = await api.get(`/documents/${id}/chunks`);
    setChunks(data);
  }

  async function remove(id: string) {
    await api.delete(`/documents/${id}`);
    load();
  }

  return (
    <section>
      <div className="page-title"><div><h1>知识库管理</h1><p>上传留学资料，系统会自动进行文本切片，用于后续 RAG 检索。</p></div></div>
      <div className="two-col">
        <div className="panel">
          <h2>新增文档</h2>
          <form onSubmit={add} className="form-stack">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="文档标题" />
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴文档文本" />
            <button className="primary">上传并切片</button>
          </form>
        </div>
        <div className="panel">
          <h2>文档列表</h2>
          {documents.map((doc) => (
            <div className="list-row" key={doc.id}>
              <div><strong>{doc.title}</strong><span>{doc.status} · {doc.chunkCount} chunks</span></div>
              <div className="actions"><button onClick={() => viewChunks(doc.id)}>查看切片</button><button onClick={() => remove(doc.id)}>删除</button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel mt">
        <h2>文档切片</h2>
        {chunks.map((c) => <div className="source-card" key={c.id}><strong>Chunk {c.chunkIndex}</strong><p>{c.content}</p></div>)}
      </div>
    </section>
  );
}
