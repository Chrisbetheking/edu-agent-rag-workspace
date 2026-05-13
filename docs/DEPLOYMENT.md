# 部署说明

## 推荐组合

- GitHub：代码仓库
- Vercel：前端部署
- Render / Railway / Fly.io：后端部署
- Supabase：PostgreSQL
- Redis：Render Key Value / Upstash / Docker Redis

## 环境变量

后端：

```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
REDIS_URL=redis://...
RAG_CACHE_TTL_SECONDS=300
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_MAX_TOKENS=1200
```

前端：

```env
VITE_API_BASE_URL=https://your-backend.example.com
```

## 数据库

在 Supabase SQL Editor 执行：

```txt
docs/supabase-full-schema.sql
```

这个文件是当前唯一推荐的初始化 SQL。旧的 `supabase-knowledge-tables.sql` 和 `supabase-vector-setup.sql` 不再维护。

## Redis

配置 `REDIS_URL` 后，后端会使用 Redis 作为 RAG 缓存。Redis 不可用时会自动回退内存缓存，避免公开 Demo 因缓存服务异常中断。

本地启动 Redis：

```bash
docker compose up redis -d
```

## 成本控制建议

1. API Key 只放后端环境变量。
2. 前端不要暴露任何模型 Key。
3. 给访客设置每日调用额度。
4. 限制输入长度、文件大小和输出 tokens。
5. Demo 环境可以不配置 `LLM_API_KEY`，系统会使用 safe fallback。
6. 简历投递建议附 GitHub、线上 Demo 和 1-2 分钟演示视频。

## GitHub 上传建议

上传解压后的项目目录，不要上传 zip 文件。根目录建议保留：

```txt
backend/
frontend/
docs/
docker-compose.yml
package.json
package-lock.json
README.md
.env.example
.gitignore
```

不要保留：

```txt
prisma/
backend/prisma/
旧阶段总结文档
旧 SQL 文件
未引用的旧前端页面
```
