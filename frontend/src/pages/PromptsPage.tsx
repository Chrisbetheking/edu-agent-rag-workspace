const prompts = [
  '院校推荐 Prompt',
  '销售话术 Prompt',
  '申请材料清单 Prompt',
  'FAQ 问答 Prompt',
];

export function PromptsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Prompt Center</span>
        <h1>Prompt 模板管理</h1>
        <p>阶段 6 会支持模板编辑、变量填充、版本记录和启用/禁用。</p>
      </div>

      <section className="panel">
        {prompts.map((prompt) => (
          <div className="list-row" key={prompt}>
            <div>
              <strong>{prompt}</strong>
              <p>当前为占位模板，后续接入后端 CRUD。</p>
            </div>
            <button className="ghost-button">编辑</button>
          </div>
        ))}
      </section>
    </div>
  );
}
