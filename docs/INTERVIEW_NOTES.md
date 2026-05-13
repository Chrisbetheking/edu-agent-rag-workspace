# 面试讲解提纲

## 1. 项目背景

EduAgent 是一个面向留学咨询场景的 AI 应用工作台。它不是单纯调用大模型 API，而是把知识库、RAG 检索、业务工具、日志、评测和权限控制组合成一个可演示的 AI 产品。

## 2. 我的主要工作

- 使用 React + TypeScript 搭建 AI 工作台页面，包括对话、知识库、评测、日志和业务工具。
- 使用 NestJS 实现认证、文档、RAG、LLM、工具、评测和日志接口。
- 设计 RAG 检索链路，支持 chunk、embedding、pgvector 语义检索、Top-K、来源引用和 keyword fallback。
- 增加 RAG 评测面板，复用真实检索链路统计命中、Recall@K 和耗时。
- 增加日志观测字段，记录检索耗时、模型耗时、cache hit、fallback 和错误类型。
- 增加 Redis-compatible cache，配置 Redis 时使用 Redis，异常时回退内存缓存。

## 3. RAG 怎么做

```txt
文档上传 → 文本切片 → chunk embedding → Supabase/pgvector 入库 → query embedding → cache lookup → pgvector Top-K → keyword fallback → 来源引用 → LLM 生成 → 调用日志
```

当前版本配置 embedding 后优先使用 pgvector 语义检索；如果 embedding 未配置、pgvector 不可用或没有命中结果，会回退增强版 keyword retrieval。这样既能展示真实 RAG 工程链路，也能保证 Demo 稳定运行。

## 4. 为什么要做评测

只做 RAG 功能不够，必须知道检索是否命中。因此我做了 Evaluation 模块：

- 测试问题集
- expected source
- Top-K retrieved chunks
- hit / miss
- Recall@K
- retrieval latency

评测直接复用 ChatService 的真实检索链路，避免测试逻辑和线上逻辑不一致。

## 5. 日志和可观测性

AI 应用的问题通常不是接口通不通，而是回答慢、检索错、来源不准、模型失败。因此日志里记录：

- total latency
- retrieval latency
- LLM latency
- ragHitCount
- ragScores
- cacheHit
- fallbackTriggered
- fallbackReason
- errorType

日志页支持筛选慢请求、RAG 未命中、缓存命中和 fallback。

## 6. Redis 缓存怎么做

`CacheService` 优先使用 Redis；如果 Redis 没配置或不可用，会自动回退内存缓存。这样本地演示更稳定，生产环境也可以通过 `REDIS_URL` 使用真正 Redis。

主要缓存 RAG 检索结果，并在日志中记录 `cacheHit`。

## 7. SSE 流式输出怎么讲

后端提供 `/chat/stream` SSE 接口。配置支持 streaming 的 OpenAI-compatible LLM 后，可以逐 token 写入前端。没有 LLM Key 时，系统使用 fallback，保证 Demo 不会中断。

面试中要说明 SSE 和 WebSocket 的区别：SSE 更适合服务端单向推送，例如大模型 token streaming；WebSocket 更适合双向实时通信。

## 8. 可以被追问的问题

- chunk size 怎么选？
- Top-K 怎么选？
- 关键词检索和语义检索的区别？
- 如何降低幻觉？
- 来源引用怎么实现？
- 评测集怎么设计？
- Redis 缓存什么？缓存失效策略是什么？
- SSE 断连怎么处理？
- 为什么要有 fallback？
- 后续如何升级到 pgvector？

## 9. 下一步优化

1. 给核心接口增加 DTO + ValidationPipe。
3. 拆分 ToolsService，把业务工具拆成多个 service。
4. 增加更多 RAG 评测样例和 bad case 分析。
