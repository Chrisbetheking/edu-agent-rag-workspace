const stats = [
  { label: 'Agent 工具', value: '3', desc: 'CGPA / 院校推荐 / 销售话术' },
  { label: '当前阶段', value: 'Phase 2', desc: '真实规则工具 + 调用日志' },
  { label: '下一阶段', value: 'Phase 3', desc: '知识库上传与文档切片' },
];

const roadmap = [
  'Phase 2：迁移 v1 业务规则，完成工具接口和调用日志。',
  'Phase 3：接入文档上传、解析、chunk 切片和知识库管理。',
  'Phase 4：加入 embedding、向量检索、RAG 问答和来源引用。',
];

export function DashboardPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">EduAgent Workspace</span>
        <h1>AI 留学咨询工作台</h1>
        <p>从纯前端 v1 原型升级为工程化 AI Agent + RAG 项目。当前已进入 Phase 2。</p>
      </div>

      <div className="stats-grid">
        {stats.map((item) => (
          <article className="stat-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.desc}</p>
          </article>
        ))}
      </div>

      <section className="panel">
        <h2>当前已完成</h2>
        <div className="card-grid">
          <article className="feature-card"><strong>后端工具接口</strong><p>CGPA 换算、院校推荐、销售话术生成已由后端统一提供。</p></article>
          <article className="feature-card"><strong>前端工具表单</strong><p>支持输入学生背景并展示结构化输出。</p></article>
          <article className="feature-card"><strong>调用日志</strong><p>每次工具调用记录输入、输出、耗时和时间。</p></article>
        </div>
      </section>

      <section className="panel">
        <h2>后续路线</h2>
        <ul className="check-list">
          {roadmap.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}
