const documents = [
  { name: '英国计算机硕士申请要求.pdf', status: '已解析', chunks: 42, updatedAt: '2026-05-11' },
  { name: '澳洲八大申请 FAQ.md', status: '待接入', chunks: 0, updatedAt: '2026-05-11' },
  { name: '马来西亚本科成绩换算说明.txt', status: '待接入', chunks: 0, updatedAt: '2026-05-11' },
];

export function KnowledgeBasePage() {
  return (
    <div className="page">
      <div className="page-header row-between">
        <div>
          <span className="eyebrow">Knowledge Base</span>
          <h1>知识库管理</h1>
          <p>阶段 3 会接入真实文档上传、解析、切片和向量化。</p>
        </div>
        <button className="primary-button">上传文档</button>
      </div>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>文档名</th>
              <th>状态</th>
              <th>切片数</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.name}>
                <td>{doc.name}</td>
                <td>{doc.status}</td>
                <td>{doc.chunks}</td>
                <td>{doc.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
