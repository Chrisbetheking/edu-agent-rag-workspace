# EduAgent — AI + RAG 留学咨询工作台

EduAgent 是一个面向留学咨询业务的 AI 应用全栈项目，覆盖 AI 咨询、客户线索、申请案卷、知识库、Agent 工具、RAG 评测与日志观测。项目重点展示 AI 应用工程落地能力，而不是单纯聊天 Demo。

## 核心能力

- **AI 咨询工作台**：支持学生背景输入、选校建议、时间线、风险提示和下一步行动。
- **RAG 知识库**：支持文本资料导入、chunk 切片、embedding 向量化、pgvector 语义检索、keyword fallback、Top-K 检索、来源引用与评测。
- **Agent 工具**：包含 CGPA 换算、院校推荐、材料清单、增长内容和申请流程编排。
- **流式输出**：后端提供 SSE 接口；配置真实 LLM Key 后可使用 OpenAI-compatible streaming。
- **缓存与观测**：RAG 检索结果支持 Redis 缓存；没有 Redis 时自动回退内存缓存。日志记录耗时、RAG 命中、cache hit、fallback 和错误类型。
- **持久化**：支持 Supabase / PostgreSQL 存储文档、chunks、会话、消息、日志和评测结果。

## 技术栈

| 层级 | 技术 |
|---|---|
| Frontend | React, TypeScript, Vite, Zustand |
| Backend | NestJS, TypeScript, SSE, JWT |
| AI / RAG | DeepSeek/OpenAI-compatible LLM, embedding API, pgvector retrieval, keyword fallback, Top-K, evaluation |
| Storage | PostgreSQL / Supabase, pgvector, in-memory fallback |
| Cache | Redis via `REDIS_URL`, memory fallback |
| Deploy | Vercel, Render, Supabase, Docker Compose |

## 项目结构

```txt
.
├── backend/                 # NestJS API
├── frontend/                # React 工作台
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── INTERVIEW_NOTES.md
│   └── supabase-full-schema.sql
├── docker-compose.yml
├── .env.example
└── package.json
```

## 本地启动

```bash
npm run install:all
cp .env.example .env
npm run dev:backend
npm run dev:frontend
```

默认地址：

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health: `http://localhost:3000/health`

## 数据库初始化

如果使用 Supabase / PostgreSQL，执行：

```bash
psql "$DATABASE_URL" -f docs/supabase-full-schema.sql
```

或者复制 `docs/supabase-full-schema.sql` 到 Supabase SQL Editor 执行。

不配置 `DATABASE_URL` 时，后端会使用内存数据，适合本地演示。


## Embedding + pgvector 语义检索

DeepSeek 继续负责生成回答；embedding API 负责把问题和知识库 chunk 转成向量；Supabase pgvector 负责语义检索。

不配置 embedding 时，系统会自动使用 keyword RAG fallback，不影响 Demo。

```env
EMBEDDING_API_KEY=
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
```

已有旧知识库数据时，可以在配置 embedding 后调用：

```bash
curl -X POST http://localhost:3000/documents/embeddings/rebuild
```

新上传或批量导入的文档会在入库时自动生成 chunk embedding。

## Redis 缓存

配置 `REDIS_URL` 后，RAG 检索缓存会写入 Redis；Redis 不可用时会自动回退到内存缓存，保证 Demo 不会因为缓存服务异常而中断。

```env
REDIS_URL=redis://localhost:6379
RAG_CACHE_TTL_SECONDS=300
```

本地可以使用：

```bash
docker compose up redis -d
```

## 常用验证命令

```bash
npm run lint
npm run build
curl http://localhost:3000/health
curl -X POST http://localhost:3000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"topK":3}'
```

## 当前实现边界

- 已实现：工作台页面、RAG keyword retrieval、embedding + pgvector 语义检索、来源引用、评测、日志、Redis-compatible cache、SSE 接口、LLM fallback。
- 进行中：ToolsService 细粒度拆分、DTO + ValidationPipe 参数校验。

## 面试讲解重点

1. 为什么不是简单聊天框，而是 AI 应用工作台。
2. RAG 链路如何做：文档导入、chunk、Top-K、来源引用、fallback、评测。
3. 如何观测 AI 调用：检索耗时、LLM 耗时、cache hit、RAG 命中、fallback 原因。
4. SSE 流式输出和前端 AI 交互体验如何处理。
5. pgvector 语义检索如何与 keyword fallback 组合。
