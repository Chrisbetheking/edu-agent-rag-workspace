# 项目架构说明

## 总体架构

```txt
用户浏览器
   ↓
React + TypeScript 前端
   ↓
NestJS 后端 API
   ↓
认证 / 限流 / 日志 / Agent 工具 / RAG 检索
   ↓
PostgreSQL / Redis / Vector Store / LLM API
```

## 模块划分

### 前端

- 登录模块
- Dashboard 工作台
- AI 对话模块
- 知识库管理模块
- Agent 工具模块
- Prompt 模板模块
- RAG 评测模块
- 日志模块

### 后端

- AuthModule：登录与用户信息
- DocumentsModule：文档上传、解析、切片
- RagModule：检索、相似度计算、来源引用
- ChatModule：多轮会话与 SSE 流式输出
- ToolsModule：CGPA、院校推荐、话术、材料清单
- PromptsModule：Prompt 模板管理
- EvalModule：RAG 评测
- LogsModule：工具调用日志和请求日志

## 为什么这样设计

本项目的目标不是做一个简单聊天框，而是模拟真实企业 AI 应用平台。系统将业务工具、知识库、对话、日志、评测和权限组合在一起，体现 AI 应用研发中的工程化能力。
