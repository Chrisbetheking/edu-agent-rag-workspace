import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type PromptItem = {
  id: string;
  name: string;
  scene: string;
  content: string;
  variables?: string[];
  enabled?: boolean;
};

const sceneOptions = ['admission_consulting', 'school_recommendation', 'sales_copywriting', 'material_checklist', 'custom'];

export default function Prompts() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [name, setName] = useState('英国计算机硕士选校 Prompt');
  const [scene, setScene] = useState('school_recommendation');
  const [content, setContent] = useState('请基于学生背景、目标国家、目标专业、预算和知识库资料，生成冲刺/匹配/保底三档选校建议，并明确推荐原因、风险和下一步动作。');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setError('');
    try {
      const { data } = await api.get('/prompts');
      setPrompts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '加载 Prompt 失败');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/prompts', {
        name,
        scene,
        content,
        variables: ['学生背景', '目标国家', '目标专业', '预算', '知识库来源'],
        enabled: true,
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '保存 Prompt 失败');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/prompts/${id}`);
    await load();
  }

  const stats = useMemo(() => ({
    total: prompts.length,
    enabled: prompts.filter((prompt) => prompt.enabled !== false).length,
    scenes: new Set(prompts.map((prompt) => prompt.scene)).size,
  }), [prompts]);

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">PromptOps</span>
          <h1>Prompt 模板管理</h1>
          <p>把大模型输出标准化，方便后续做版本管理、场景切换和 A/B 测试。</p>
        </div>
        <span className="status-dot">{stats.enabled} enabled</span>
      </div>

      <div className="stats-grid three">
        <div className="stat-card"><span>模板数量</span><strong>{stats.total}</strong><p>Prompt assets</p></div>
        <div className="stat-card"><span>启用模板</span><strong>{stats.enabled}</strong><p>可被业务调用</p></div>
        <div className="stat-card"><span>业务场景</span><strong>{stats.scenes}</strong><p>scene coverage</p></div>
      </div>

      {error && <div className="error-card"><strong>请求失败</strong><p>{error}</p></div>}

      <div className="two-col wide-right">
        <section className="panel form-panel">
          <div className="panel-title compact"><span className="eyebrow">Create</span><h2>新增 Prompt</h2></div>
          <form className="form-stack" onSubmit={submit}>
            <label>模板名称<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>业务场景<select value={scene} onChange={(e) => setScene(e.target.value)}>{sceneOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Prompt 内容<textarea className="large-textarea" value={content} onChange={(e) => setContent(e.target.value)} /></label>
            <button className="primary" disabled={saving}>{saving ? '保存中...' : '保存 Prompt'}</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Templates</span><h2>模板列表</h2></div>
          {prompts.length === 0 ? (
            <div className="empty-mini">暂无 Prompt。新增模板后可用于展示 PromptOps 能力。</div>
          ) : prompts.map((prompt) => (
            <article className="prompt-card" key={prompt.id}>
              <div className="row-between top-align">
                <div>
                  <strong>{prompt.name}</strong>
                  <span>{prompt.scene}</span>
                </div>
                <div className="actions">
                  <small className={prompt.enabled === false ? 'pill muted' : 'pill success'}>{prompt.enabled === false ? 'disabled' : 'enabled'}</small>
                  <button className="danger-button" onClick={() => remove(prompt.id)}>删除</button>
                </div>
              </div>
              <p>{prompt.content}</p>
              {!!prompt.variables?.length && <div className="tag-row">{prompt.variables.map((item) => <span key={item}>{item}</span>)}</div>}
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
