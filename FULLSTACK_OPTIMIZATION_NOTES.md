# EduAgent Full-stack Optimization Notes

本次改造目标：把项目从“页面 demo”升级成更完整的 AI 留学咨询系统，重点修复登录、前台/后台/销售/Agent 工具 AI 调用、白屏保护和导出能力。

## 已完成

### 1. 登录与安全
- 删除前端硬编码测试账号和密码。
- 后端不再默认使用旧测试密码，管理员登录必须通过环境变量配置：
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `ADMIN_DISPLAY_NAME`
- 前端增加 auth storage version，会自动清理旧浏览器缓存 token，重新进入登录页。
- API 遇到 401 会清理本地登录态并跳回 `/login`。

### 2. 白屏防护
- 新增 `ErrorBoundary`，前端渲染异常时不再直接白屏。
- 异常页面提供“刷新页面”和“清除登录状态并回到登录页”。

### 3. 后端 AI 工具链
- `ToolsService` 全面重写。
- 前台增长、销售话术、院校推荐、申请后台、Agent 综合方案都支持 DeepSeek/LLM 调用。
- 如果没有配置 LLM Key 或 LLM 失败，会自动降级到结构化 fallback，不会导致页面崩溃。
- Agent 综合方案会串联：CGPA → 院校推荐 → 前台增长 → 销售话术 → 申请后台 → 材料清单。
- 工具调用日志会同时在内存日志中展示，即使 Supabase call_logs 可用也不会丢失工具调用轨迹。

### 4. 前台增长工作台
- 新增学生称呼、申请学位等字段。
- 输出结构化小红书、短视频、微信私域、内容日历。
- 支持导出 Markdown 和 JSON。
- 输出区做了卡片化和复制按钮。

### 5. 申请后台
- 接入 AI 生成文书方案。
- 支持 PS 主题、PS 大纲、Personal Statement 初稿、CV Summary、推荐信素材、材料清单、风险与下一步。
- 支持导出文书方案 Markdown 和 JSON。

### 6. Agent 工具中心
- 由原始 JSON 展示升级为业务卡片展示。
- “运行完整 Agent 流”会串联多个工具并展示 workflow trace。
- 支持导出综合方案 Markdown 和 JSON。

### 7. 部署环境变量
参考 `.env.example` 更新部署平台环境变量，尤其是：

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=你自己的强密码
JWT_SECRET=一个长随机字符串
LLM_API_KEY=你的 DeepSeek Key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
FORCE_MOCK_TOOLS=false
FORCE_MOCK_CHAT=false
```

## 构建验证

已在本地容器中执行并通过：

```bash
cd backend && npm run build
cd frontend && npm run build
```
