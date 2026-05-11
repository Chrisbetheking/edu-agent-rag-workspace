import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { api.get('/tools/logs').then((res) => setLogs(res.data)); }, []);
  return (
    <section>
      <div className="page-title"><div><h1>工具调用日志</h1><p>记录每次 Agent 工具调用的输入、输出、耗时和状态。</p></div></div>
      <div className="panel">
        {logs.map((log) => (
          <div className="source-card" key={log.id}>
            <div className="row-between"><strong>{log.toolName}</strong><span>{log.status} · {log.duration}ms</span></div>
            <small>{new Date(log.createdAt).toLocaleString()}</small>
            <pre>{JSON.stringify({ input: log.input, output: log.output }, null, 2)}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
