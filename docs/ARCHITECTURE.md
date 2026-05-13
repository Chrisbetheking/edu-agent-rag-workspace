# EduAgent 架构说明

## 目标

EduAgent 的目标是模拟真实留学咨询公司的 AI 应用工作台，而不是只做一个聊天框。系统把 AI 对话、知识库、业务工具、评测、日志和权限整合在一起，展示 AI 应用工程落地能力。

## 请求链路

```txt
React / TypeScript Frontend
        ↓
NestJS API
        ↓
Auth / Quota / Rate Control
        ↓
RAG Retrieval（pgvector + keyword fallback）+ Agent Tools
        ↓
LLM Service / Safe Fallback
        ↓
PostgreSQL Logs + Redis Cache
```

## 前端模块

- Dashboard：业务概览和关键指标。
- Chat：AI 咨询、多轮对话、来源引用、工具调用展示。
- Knowledge：文档导入、知识库管理、chunk 统计。
- Tools：CGPA、选校、材料清单、增长内容、申请计划等 Agent 工具。
- Evaluation：RAG 测试集、Top-K 命中、来源覆盖与耗时。
- Logs：AI 调用日志、慢请求、RAG 未命中、cache hit、fallback 筛选。
- Applications / FrontDesk：模拟咨询业务前后台流程。

## 后端模块

- AuthModule：登录、访客模式、JWT、额度控制。
- DocumentsModule：文档上传、文本抽取、chunk 切分、入库。
- ChatModule：RAG 检索、上下文拼接、LLM 调用、SSE 输出、日志落库。
- ToolsModule：业务工具和 Agent 编排。
- PromptsModule：Prompt 模板管理。
- EvalModule：复用真实检索链路做 RAG 评测。
- LlmModule：OpenAI-compatible LLM 调用与 fallback。

## RAG 链路

```txt
用户问题
  ↓
query normalize
  ↓
RAG cache lookup
  ↓
embedding configured? pgvector semantic retrieval : keyword fallback
  ↓
Top-K ranking
  ↓
context truncation + source citation
  ↓
LLM answer / safe fallback
  ↓
call log + eval metrics
```

当前版本支持两层检索：配置 embedding 后优先使用 pgvector 语义检索；没有 embedding 或 pgvector 查询失败时，自动回退增强版 keyword RAG。keyword fallback 包含领域词、中文 n-gram、国家词权重和国家不匹配惩罚，保证公开 Demo 在没有 embedding API 时仍可运行。

## 缓存设计

`CacheService` 会优先使用 Redis：

```txt
REDIS_URL configured → Redis cache
REDIS unavailable    → memory cache fallback
REDIS_URL empty      → memory cache
```

缓存对象主要是 RAG 检索结果。日志中记录 `cacheHit`，便于观察重复问题的命中情况。

## 可观测性

调用日志包含：

- requestId / conversationId / userId
- total latency / retrieval latency / LLM latency
- ragHitCount / ragScores
- cacheHit
- fallbackTriggered / fallbackReason
- errorType / error
- toolNames

这些字段用于定位慢请求、RAG 未命中、LLM 失败和 fallback 触发原因。
