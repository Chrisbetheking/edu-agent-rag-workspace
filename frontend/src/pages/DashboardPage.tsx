const metrics = [
  { label: '知识库文档', value: '12', hint: '阶段 3 接入真实上传' },
  { label: '今日 AI 问答', value: '24', hint: '阶段 5 接入 SSE' },
  { label: 'Agent 工具', value: '3', hint: 'CGPA / 院校推荐 / 文案' },
  { label: 'Prompt 模板', value: '6', hint: '阶段 6 开启版本管理' },
];

const roadmap = [
  '阶段 1：工程骨架、登录、路由、API 封装',
  '阶段 2：迁移旧 Demo 的 CGPA、院校推荐、文案工具',
  '阶段 3：知识库上传、解析、切片',
  '阶段 4：Embedding、Top-K 检索、来源引用',
  '阶段 5：多轮对话、SSE 流式输出',
];

export function DashboardPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Overview</span>
        <h1>研发工作台</h1>
        <p>当前版本是工程化骨架，后续逐步接入 RAG、Agent 和评测能力。</p>
      </div>

      <div className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </article>
        ))}
      </div>

      <section className="panel">
        <h2>阶段路线</h2>
        <div className="timeline">
          {roadmap.map((item, index) => (
            <div className="timeline-item" key={item}>
              <span>{index + 1}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
