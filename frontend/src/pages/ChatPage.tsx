import { useState } from 'react';

const sampleAnswer = `根据当前阶段的 Mock 数据，系统会在后续通过 RAG 检索院校知识库，并结合 CGPA 换算、院校推荐等工具生成结构化建议。`;

export function ChatPage() {
  const [question, setQuestion] = useState('APU CS 本科 CGPA 3.2，预算 30 万，想申请英国硕士，有什么建议？');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好，我是 EduAgent。当前为阶段 1 骨架版，后续会接入真实 RAG 和 Agent 工具调用。' },
  ]);

  const handleSend = () => {
    if (!question.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: sampleAnswer },
    ]);
    setQuestion('');
  };

  return (
    <div className="page chat-layout">
      <div className="page-header">
        <span className="eyebrow">AI Chat</span>
        <h1>AI 留学咨询对话</h1>
        <p>阶段 1 为 Mock 对话，后续接入 SSE 流式输出、来源引用和工具调用轨迹。</p>
      </div>

      <div className="chat-window">
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={index}>
            <span>{message.role === 'user' ? '用户' : 'EduAgent'}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      <div className="composer">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
        <button className="primary-button" onClick={handleSend}>发送</button>
      </div>
    </div>
  );
}
