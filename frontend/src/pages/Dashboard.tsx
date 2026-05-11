import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Dashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/documents').then((res) => setDocuments(res.data));
    api.get('/tools/logs').then((res) => setLogs(res.data));
  }, []);

  return (
    <section>
      <div className="page-title">
        <div>
          <h1>工作台总览</h1>
          <p>当前是 Demo 模式，默认使用 Mock LLM，适合公开展示，避免 API 被刷。</p>
        </div>
        <span className="status-dot">Phase Final</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>知识库文档</span><strong>{documents.length}</strong></div>
        <div className="stat-card"><span>文档切片</span><strong>{documents.reduce((s, d) => s + (d.chunkCount || 0), 0)}</strong></div>
        <div className="stat-card"><span>工具调用</span><strong>{logs.length}</strong></div>
        <div className="stat-card"><span>Demo 安全模式</span><strong>开启</strong></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h2>最近文档</h2>
          {documents.slice(0, 5).map((doc) => (
            <div className="list-row" key={doc.id}>
              <div><strong>{doc.title}</strong><span>{doc.fileName}</span></div>
              <em>{doc.chunkCount} chunks</em>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>最近工具调用</h2>
          {logs.slice(0, 5).map((log) => (
            <div className="list-row" key={log.id}>
              <div><strong>{log.toolName}</strong><span>{new Date(log.createdAt).toLocaleString()}</span></div>
              <em>{log.duration}ms</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
