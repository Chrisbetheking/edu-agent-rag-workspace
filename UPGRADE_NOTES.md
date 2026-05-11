# EduAgent UI + Full-stack Upgrade Notes

## 本次升级重点

- 全站视觉系统重做：侧边栏、登录页、Dashboard、知识库、工具中心、PromptOps、RAG 评测、调用日志统一为作品集级产品风格。
- Dashboard 升级为真实数据总览：读取知识库统计、调用概览、健康状态、最近文档、最近调用和工具触发分布。
- 后端新增 `GET /documents/stats`：聚合文档数、切片数、解析状态和最近文档。
- 后端新增 `GET /tools/overview`：聚合总调用、成功率、平均耗时、平均 RAG 命中、工具使用分布、模型分布和最近日志。
- CORS 支持通过 `FRONTEND_ORIGIN` 或 `CORS_ORIGINS` 环境变量配置多个前端域名。
- 表单交互加强：错误态、加载态、空状态、结构化 JSON 输出和 tag/chunk/trace 卡片。

## 验证结果

- `frontend npm run build` 已通过。
- `backend npm run build` 已通过。

## 部署提醒

如果你的 Vercel 域名不是默认值，请在 Render 后端环境变量中加入：

```bash
FRONTEND_ORIGIN=https://你的-vercel-域名.vercel.app
```

多个域名可用英文逗号分隔：

```bash
CORS_ORIGINS=https://a.vercel.app,https://b.vercel.app,http://localhost:5173
```
