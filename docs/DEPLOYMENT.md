# 部署说明

## 推荐展示方案

- GitHub：代码仓库
- Vercel：前端部署
- Render：后端部署
- Supabase：PostgreSQL + pgvector
- Redis：Render Key Value 或本地 Docker

## 成本控制建议

公开 Demo 默认不要直接开放真实大模型 API：

1. API Key 只放后端环境变量。
2. 前端不能出现任何 Key。
3. Demo 默认开启 `DEMO_MODE=true`。
4. 对每个用户限制每日调用次数。
5. 限制输入长度、文件大小和输出 tokens。
6. 简历展示时可以提供演示账号和演示视频。

## GitHub 上传方式

不要上传 zip 文件。需要上传解压后的完整目录：

```txt
backend/
frontend/
docs/
prisma/
docker-compose.yml
package.json
README.md
.env.example
.gitignore
```

提交信息建议：

```txt
complete eduagent rag workspace
```
