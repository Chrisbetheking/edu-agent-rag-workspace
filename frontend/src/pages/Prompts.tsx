import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Prompts() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [name, setName] = useState('新的留学咨询 Prompt');
  const [scene, setScene] = useState('custom');
  const [content, setContent] = useState('请基于学生背景和知识库资料生成结构化建议。');

  function load() { api.get('/prompts').then((res) => setPrompts(res.data)); }
  useEffect(load, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await api.post('/prompts', { name, scene, content, variables: ['学生背景', '目标国家'], enabled: true });
    load();
  }

  async function remove(id: string) {
    await api.delete(`/prompts/${id}`);
    load();
  }

  return (
    <section>
      <div className="page-title"><div><h1>Prompt 模板管理</h1><p>管理不同业务场景下的 Prompt，便于后续接入真实 LLM。</p></div></div>
      <div className="two-col">
        <div className="panel">
          <h2>新增 Prompt</h2>
          <form className="form-stack" onSubmit={submit}>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <input value={scene} onChange={(e) => setScene(e.target.value)} />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} />
            <button className="primary">保存 Prompt</button>
          </form>
        </div>
        <div className="panel">
          <h2>模板列表</h2>
          {prompts.map((p) => (
            <div className="source-card" key={p.id}>
              <div className="row-between"><strong>{p.name}</strong><button onClick={() => remove(p.id)}>删除</button></div>
              <span>{p.scene} · {p.enabled ? '启用' : '停用'}</span>
              <p>{p.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
