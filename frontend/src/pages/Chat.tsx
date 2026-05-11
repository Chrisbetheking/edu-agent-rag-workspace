import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

interface ChatResult {
  answer: string;
  sources: any[];
  toolCalls: any[];
  conversationId: string;
}

export default function Chat() {
  const [question, setQuestion] = useState(
    'APU 计算机本科 CGPA 3.2，想申请英国硕士，应该怎么选校？预算30万',
  );
  const [result, setResult] = useState<ChatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/chat/conversations')
      .then((res) => setConversations(res.data))
      .catch((err) => {
        console.error('加载历史会话失败：', err);
      });
  }, []);

  async function ask(e: FormEvent) {
    e.preventDefault();

    if (!question.trim()) {
      setError('请输入问题。');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post('/chat', {
        question,
        topK: 3,
      });

      setResult(data);

      const conv = await api.get('/chat/conversations');
      setConversations(conv.data);
    } catch (err: any) {
      console.error('AI 对话请求失败：', err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        '请求失败，请稍后重试。';

      setError(`AI 对话请求失败：${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <h1>AI 对话工作台</h1>
          <p>支持 RAG 来源引用和 Agent 工具调用。当前已接入真实大模型。</p>
        </div>
      </div>

      <div className="chat-layout">
        <div className="panel chat-panel">
          <form onSubmit={ask} className="chat-input">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="请输入留学咨询问题..."
            />

            <button className="primary" disabled={loading}>
              {loading ? '生成中...' : '发送问题'}
            </button>
          </form>

          {error && (
            <div className="answer-card">
              <h2>请求失败</h2>
              <p className="preline">{error}</p>
            </div>
          )}

          {result && (
            <div className="answer-card">
              <h2>AI 回答</h2>
              <p className="preline">{result.answer}</p>

              <h3>来源引用</h3>
              <div className="source-list">
                {result.sources.length ? (
                  result.sources.map((s, i) => (
                    <div className="source-card" key={s.id || i}>
                      <strong>{s.documentTitle || '未命名资料'}</strong>
                      <span>相似度：{s.score}</span>
                      <p>{s.content}</p>
                    </div>
                  ))
                ) : (
                  <p>暂无来源引用。</p>
                )}
              </div>

              <h3>工具调用</h3>
              {result.toolCalls.length ? (
                result.toolCalls.map((t, i) => (
                  <pre key={i}>{JSON.stringify(t, null, 2)}</pre>
                ))
              ) : (
                <p>本次未触发工具。</p>
              )}
            </div>
          )}
        </div>

        <div className="panel side-panel">
          <h2>历史会话</h2>

          {conversations.length ? (
            conversations.map((c) => (
              <div className="list-row" key={c.id}>
                <strong>{c.title}</strong>
                <span>{new Date(c.updatedAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p>暂无历史会话。</p>
          )}
        </div>
      </div>
    </section>
  );
}
