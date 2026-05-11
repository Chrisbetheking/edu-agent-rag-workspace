# EduAgent - AI Agent + RAG 留学咨询工作台

在线演示地址：https://edu-agent-rag-workspace.vercel.app

后端健康检查：https://edu-agent-backend.onrender.com/health
测试账号：admin / admin123

EduAgent 是一个面向留学咨询业务的 AI Agent + RAG 工作台，目标是把早期纯前端规则 Demo 升级为完整的 AI 应用研发项目。

项目覆盖：知识库管理、RAG 检索问答、CGPA 换算、院校推荐、销售话术生成、Prompt 模板管理、工具调用日志、RAG 评测面板、SSE 流式输出、限流与 Docker 部署骨架。

> 当前版本适合用于 GitHub 展示、简历项目、面试讲解和后续真实 API 接入。默认使用 Mock LLM 与内存数据，避免公开 Demo 被刷 API 费用。后续可替换为真实数据库、Embedding 服务和大模型 API。

---

## 一句话项目介绍

基于 React + TypeScript + NestJS 构建的 AI 留学咨询工作台，支持上传院校资料后进行 RAG 检索问答，并通过 Agent 工具完成 CGPA 换算、院校推荐、申请材料清单和销售话术生成。本项目当前支持本地运行：前端运行于 localhost:5173，后端运行于 localhost:3000，已完成登录、Dashboard、知识库、Agent 工具、Prompt 管理、RAG 评测等模块的 Demo 版本。

---

## 技术栈

### 前端

- React
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- Markdown 渲染
- SSE 流式输出
- 响应式中后台布局

### 后端

- NestJS
- TypeScript
- JWT 鉴权骨架
- Multer 文件上传
- Mock RAG 检索链路
- Agent 工具服务
- Prompt 模板管理
- 工具调用日志
- RAG 评测模块
- 限流与输入长度控制

### 数据与部署

- PostgreSQL 表结构设计
- Redis 缓存设计
- Docker Compose
- `.env.example` 环境变量模板
- 可扩展 pgvector / Supabase / Render / Vercel 部署

---

## 已完成功能

### 1. 登录与工作台

- 测试账号登录
- 用户信息保存
- Dashboard 数据概览
- 最近工具调用记录
- 最近知识库文档记录

测试账号：

```txt
账号：admin
密码：admin123
```

---

### 2. Agent 工具

已实现 4 个留学咨询业务工具：

- CGPA 换算工具
- 院校推荐工具
- 销售话术生成工具
- 申请材料清单工具

每次工具调用会记录：

- 工具名称
- 输入参数
- 输出结果
- 调用耗时
- 成功/失败状态
- 创建时间

---

### 3. 知识库管理

支持：

- 文档上传
- 文档列表
- 文档删除
- 文档重新解析
- 文本 chunk 切片
- 查看切片内容
- 文档状态展示

当前版本默认支持 `.txt / .md / .json` 文本解析；PDF 解析接口已预留，后续可接入 `pdf-parse`。

---

### 4. RAG 检索问答

已实现完整 Mock RAG 链路：

```txt
用户问题 → Query 分析 → Top-K 检索 → 命中文档片段 → 来源引用 → 生成回答
```

支持：

- Top-K 检索
- 相似度分数
- 来源引用
- 命中文档片段
- 无结果兜底
- 多轮会话记录
- SSE 流式输出接口

---

### 5. Prompt 模板管理

支持：

- Prompt 列表
- 创建 Prompt
- 编辑 Prompt
- 启用/禁用
- 变量说明
- 不同业务场景模板

内置模板：

- 院校推荐 Prompt
- 销售话术 Prompt
- FAQ 问答 Prompt
- 申请材料 Prompt

---

### 6. RAG 评测面板

支持：

- 创建测试问题
- 运行评测
- Recall@K
- 命中率
- 平均响应时间
- bad case 分析
- 不同 Top-K 参数对比

这是本项目区别于普通 RAG Demo 的重点模块。

---

### 7. 安全与成本控制

已设计：

- API Key 不放前端
- 后端统一调用模型接口
- Demo 账号登录
- 请求频率限制
- 输入长度限制
- 输出长度限制
- Mock 模式避免公开 Demo 消耗真实 API

---

## 项目结构

```txt
edu-agent-rag-workspace/
├── frontend/                 # React + TypeScript 前端
├── backend/                  # NestJS 后端
├── docs/                     # 中文项目文档
├── prisma/                   # 数据库表结构设计
├── docker-compose.yml        # PostgreSQL + Redis
├── .env.example              # 环境变量模板
├── package.json              # 根目录脚本
└── README.md                 # 项目说明
```

---

## 本地启动

### 1. 安装依赖

```bash
npm install
npm run install:all
```

### 2. 启动数据库和 Redis

```bash
docker compose up -d
```

### 3. 启动后端

```bash
cd backend
cp ../.env.example .env
npm run start:dev
```

后端默认运行：

```txt
http://localhost:3000
```

### 4. 启动前端

```bash
cd frontend
cp ../.env.example .env
npm run dev
```

前端默认运行：

```txt
http://localhost:5173
```

---

## 核心接口

### 认证

```txt
POST /auth/login
GET  /auth/profile
```

### 文档知识库

```txt
GET    /documents
POST   /documents/upload
GET    /documents/:id/chunks
POST   /documents/:id/reprocess
DELETE /documents/:id
```

### Agent 工具

```txt
POST /tools/cgpa-convert
POST /tools/school-recommend
POST /tools/copywriting
POST /tools/material-list
GET  /tools/logs
```

### AI 对话与 RAG

```txt
GET  /chat/conversations
POST /chat/conversations
GET  /chat/conversations/:id/messages
POST /chat
GET  /chat/stream
```

### Prompt 模板

```txt
GET    /prompts
POST   /prompts
PATCH  /prompts/:id
DELETE /prompts/:id
```

### RAG 评测

```txt
GET  /eval/questions
POST /eval/questions
POST /eval/run
GET  /eval/results
```

---

## 简历项目描述

**EduAgent：AI Agent + RAG 留学咨询工作台｜React + TypeScript + NestJS**

- 基于 React + TypeScript + NestJS 构建 AI 留学咨询工作台，支持知识库管理、多轮对话、SSE 流式输出、Prompt 模板管理和结果导出。
- 设计并实现 RAG 检索链路，支持文档上传、文本切片、Top-K 检索、相似度分数和来源引用展示，提升 AI 回答的可追溯性。
- 实现 Agent 工具调用模块，封装 CGPA 换算、院校推荐、销售话术生成、申请材料清单等业务工具，并记录调用参数、耗时和异常日志。
- 搭建 RAG 评测面板，支持测试问题集、Recall@K、命中率、平均响应时间和 bad case 分析，用于对比不同检索参数效果。
- 设计登录鉴权、请求限流、Mock 模式和 Docker Compose 部署方案，避免公开 Demo 直接暴露 API Key 或产生不可控调用成本。

---

## 和旧项目的关系

旧仓库 `ai-agent-workflow-platform-` 是 v1 纯前端原型，主要验证业务流程、动态表单、规则匹配和结构化结果展示。

本仓库是 v2 工程化版本，在原有留学咨询 Agent 场景上升级为完整 AI 应用系统，补齐前端工程化、后端接口、知识库、RAG、Agent 工具、日志、评测和部署能力。
