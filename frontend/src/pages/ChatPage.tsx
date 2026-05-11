import { FormEvent, useState } from 'react';
import { sendChatMessage } from '../api/chat';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolHints?: string[];
  sources?: Array<{ title: string; snippet: string }>;
};

export function ChatPage() {
  const [input, setInput] = useState('APU CS 本科 CGPA 3.2，想申请英国硕士，有哪些学校推荐？');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '我是 EduAgent。当前 Phase 2 已接入规则工具，你可以先体验 CGPA、院校推荐和销售话术生成。Phase 4 将接入真实 RAG。',
    },
  ]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    const userMessage: ChatMessage = { id: `user_${Date.now()}`, role: 'user', content: input };
    setMessages((items) => [...items, userMessage]);
    setLoading(true);
    try {
      const data = await sendChatMessage(input);
      setMessages((items) => [...items, data]);
      setInput('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">AI Workspace</span>
        <h1>AI 对话工作台</h1>
        <p>Phase 2 先做工具联动提示；后续会升级为 SSE 流式输出和 RAG 来源引用。</p>
      </div>

      <section className="chat-shell">
        <div className="messages">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <strong>{message.role === 'user' ? '你' : 'EduAgent'}</strong>
              <p>{message.content}</p>
              {message.toolHints && message.toolHints.length > 0 && (
                <div className="hint-box">
                  <span>工具建议</span>
                  {message.toolHints.map((hint) => <em key={hint}>{hint}</em>)}
                </div>
              )}
              {message.sources && (
                <div className="source-list">
                  {message.sources.map((source) => (
                    <div className="source-card" key={source.title}>
                      <strong>{source.title}</strong>
                      <span>{source.snippet}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <form className="chat-input" onSubmit={submit}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入留学咨询问题..." />
          <button className="primary-button" disabled={loading}>{loading ? '发送中...' : '发送'}</button>
        </form>
      </section>
    </div>
  );
}
