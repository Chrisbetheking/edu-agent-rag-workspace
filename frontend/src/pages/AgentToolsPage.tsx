const tools = [
  { name: 'CGPA 换算工具', desc: '将 4.0 / 5.0 / 百分制成绩换算成申请参考区间。', status: '阶段 2 迁移' },
  { name: '院校推荐工具', desc: '根据国家、专业、预算、GPA、语言成绩输出冲刺/匹配/保底院校。', status: '阶段 2 迁移' },
  { name: '销售话术生成工具', desc: '根据学生背景生成微信沟通话术、电话提纲和短视频脚本。', status: '阶段 2 迁移' },
];

export function AgentToolsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Agent Tools</span>
        <h1>Agent 工具中心</h1>
        <p>工具调用会在后续记录输入参数、输出结果、耗时和异常状态。</p>
      </div>

      <div className="card-grid">
        {tools.map((tool) => (
          <article className="feature-card" key={tool.name}>
            <strong>{tool.name}</strong>
            <p>{tool.desc}</p>
            <span>{tool.status}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
