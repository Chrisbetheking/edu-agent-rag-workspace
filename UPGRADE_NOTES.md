# EduAgent Portfolio Upgrade Notes

本版按「完整留学 AI SaaS 工作台」升级：

- 登录账号改为 `CHRISWANG / 060712`，登录页移除测试账号提示。
- 新增访客免账号入口，HR 可以直接进入体验。
- 访客每日 AI 调用默认 20 次；访客可新增知识库，但不能删除系统示例数据。
- 知识库支持整篇自动切片、已有切片导入、多文件批量导入，并写入 Supabase documents / chunks。
- 新增前台增长工作台：小红书、短视频、微信私域内容生成。
- 新增申请后台：材料清单、文书重点、递交流程、风险提示。
- Agent 工具中心新增 AI 综合方案编排器。
- 新增项目架构页，并链接 Chris Wang Resume Website。
- 新增 pgvector SQL：`docs/supabase-vector-setup.sql`。

## 推荐 Render 环境变量

```bash
FRONTEND_ORIGIN=https://edu-agent-rag-workspace.vercel.app
ADMIN_USERNAME=CHRISWANG
ADMIN_PASSWORD=060712
GUEST_DAILY_QUOTA=20
JWT_SECRET=换成一个长随机字符串
DEMO_MODE=false
LLM_API_KEY=你的 DeepSeek API Key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

## Supabase 向量库升级

先运行已有表结构 SQL，再运行：

```text
docs/supabase-vector-setup.sql
```

当前代码保留 keyword fallback；后续可接 embedding API，把 chunks.embedding 填满后启用 `match_chunks` 做语义检索。
