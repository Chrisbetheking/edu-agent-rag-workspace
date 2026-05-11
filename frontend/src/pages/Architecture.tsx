const RESUME_URL = 'https://chrisbetheking.github.io/WANGHONG-s-Resume-Website/';

const flow = ['React / Vercel', 'NestJS API / Render', 'RAG Retrieve', 'DeepSeek LLM', 'Supabase Logs'];
const modules = [
  ['前台增长', '小红书文案、短视频脚本、微信跟进话术。'],
  ['AI 对话', '基于学生背景生成结构化选校方案，并展示来源和工具调用。'],
  ['知识库', '批量导入资料，自动切片，写入 documents / chunks。'],
  ['Agent 工具', 'CGPA、选校、材料清单、增长内容、申请流程综合编排。'],
  ['申请后台', '模拟真实留学公司 CRM：文书、材料、递交和风险跟进。'],
  ['可观测性', '记录模型、耗时、RAG 命中、成功率和调用日志。'],
];

export default function Architecture() {
  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">Portfolio Architecture</span>
          <h1>项目架构与面试展示</h1>
          <p>这个页面是给 HR / 面试官看的：不用读代码，也能一眼理解 EduAgent 的全栈结构、AI 流程、权限设计和向量库路线。</p>
        </div>
        <a className="primary-button resume-cta" href={RESUME_URL} target="_blank" rel="noreferrer">打开 Resume Website</a>
      </div>

      <section className="panel architecture-flow">
        <div className="panel-title compact"><span className="eyebrow">System Flow</span><h2>请求链路</h2></div>
        <div className="flow-line big-flow">{flow.map((item) => <em key={item}>{item}</em>)}</div>
        <p className="muted">用户输入学生背景 → 后端解析意图 → 检索知识库 chunks → 调用 Agent 工具 → 生成结构化结果 → 写入调用日志与可观测性面板。</p>
      </section>

      <div className="product-grid module-showcase">
        {modules.map(([title, desc]) => (
          <article className="product-card" key={title}><span>Module</span><h2>{title}</h2><p>{desc}</p></article>
        ))}
      </div>

      <div className="two-col wide-left">
        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Guest Security</span><h2>访客权限设计</h2></div>
          <ul className="check-list">
            <li>HR 可免账号进入，降低体验门槛。</li>
            <li>访客能查看系统示例知识库，但不能删除。</li>
            <li>访客新增的数据打 owner_id，只能删自己添加的。</li>
            <li>访客 AI 调用有每日额度，默认 20 次。</li>
          </ul>
        </section>
        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Vector Store Plan</span><h2>Supabase pgvector 升级路线</h2></div>
          <ol className="check-list">
            <li>在 Supabase SQL Editor 运行 docs/supabase-vector-setup.sql。</li>
            <li>给 chunks 增加 embedding vector 字段。</li>
            <li>后续接 Gemini / OpenAI embedding，把关键词检索升级为语义检索。</li>
            <li>保留 keyword fallback，避免 embedding 接口失败时 RAG 不能用。</li>
          </ol>
        </section>
      </div>
    </section>
  );
}
