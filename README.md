# EduAgent - AI Agent + RAG 留学咨询工作台

EduAgent 是一个面向留学咨询业务的 AI Agent 工作台工程化版本，基于 **React + TypeScript + NestJS + PostgreSQL + Redis** 构建。

本项目是在早期纯前端 AI 留学申请工作流 Demo 基础上的 v2 重构版，目标是从「规则匹配型原型」升级为「可扩展的 AI 应用研发项目」。

## 当前阶段

当前版本完成 **阶段 1：项目骨架**。

已包含：

- 前端 React + TypeScript + Vite 工程
- 后端 NestJS 工程
- 登录页、主布局、路由、Dashboard
- API 请求封装
- Mock 登录接口
- 健康检查接口
- Prisma 数据模型初版
- PostgreSQL / Redis 的 Docker Compose 配置
- `.env.example`
- 后续 RAG / Agent 模块目录预留

## 项目定位

面向留学咨询业务，后续支持：

- 院校知识库管理
- 文档上传与切片
- RAG 检索问答
- CGPA 换算工具
- 院校推荐 Agent
- 销售话术生成 Agent
- Prompt 模板管理
- 工具调用日志
- RAG 评测面板

## 技术栈

### Frontend

- React
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- CSS Modules / 原生 CSS

### Backend

- NestJS
- TypeScript
- JWT Auth
- Prisma
- PostgreSQL
- Redis

### DevOps

- Docker Compose
- `.env` 环境变量
- Monorepo 项目结构

## 目录结构

```txt
edu-agent-rag-workspace/
├── frontend/               # React + TypeScript 前端
├── backend/                # NestJS 后端
├── docs/                   # 架构图、面试讲解、截图
├── docker-compose.yml      # PostgreSQL + Redis
├── .env.example            # 环境变量示例
└── README.md
```

## 快速启动

### 1. 启动数据库和 Redis

```bash
docker compose up -d
```

### 2. 启动后端

```bash
cd backend
npm install
cp ../.env.example .env
npx prisma generate
npm run start:dev
```

后端默认运行在：

```txt
http://localhost:3001/api
```

健康检查：

```txt
GET http://localhost:3001/api/health
```

### 3. 启动前端

```bash
cd frontend
npm install
cp ../.env.example .env
npm run dev
```

前端默认运行在：

```txt
http://localhost:5173
```

## 测试账号

```txt
账号：admin
密码：admin123
```

## 阶段规划

### 阶段 1：项目骨架

- [x] 前端工程搭建
- [x] 后端工程搭建
- [x] 登录页
- [x] Dashboard
- [x] API 封装
- [x] 数据模型初版

### 阶段 2：迁移旧项目核心功能

- [ ] CGPA 换算工具
- [ ] 院校推荐工具
- [ ] 销售话术生成工具
- [ ] 工具调用历史

### 阶段 3：知识库管理

- [ ] 文档上传
- [ ] 文档解析
- [ ] 文本切片
- [ ] 切片查看

### 阶段 4：RAG 问答

- [ ] Embedding
- [ ] 向量检索
- [ ] Top-K 检索
- [ ] 来源引用

### 阶段 5：AI 对话工作台

- [ ] 多轮对话
- [ ] SSE 流式输出
- [ ] 历史会话
- [ ] 回答导出

## 面试讲法

这个项目可以这样介绍：

> 我之前做过一个纯前端 AI 留学申请工作流 Demo，用于验证院校推荐、GPA 换算和申请文案生成的业务流程。后续我将它重构为 EduAgent：AI Agent + RAG 留学咨询工作台，用 React + TypeScript 和 NestJS 搭建完整前后端架构，为后续接入知识库、向量检索、Agent 工具调用和 Prompt 管理做工程化准备。



## Phase 2 更新说明

本阶段已完成 v1 原型核心业务能力迁移：

- CGPA 换算工具：支持 4.0 / 5.0 / 百分制换算为申请参考区间。
- 院校推荐工具：根据国家、专业、GPA、语言成绩、预算生成冲刺/匹配/保底方案。
- 销售话术生成工具：生成微信沟通话术、电话提纲和短视频脚本。
- 工具调用日志：记录工具名称、输入、输出、调用耗时和时间。
- AI 对话页：提供工具调用建议，为后续 RAG 和 Agent 联动做准备。

> 当前规则为 Demo 规则，用于展示 AI 应用研发能力，不代表任何学校官方录取标准。

## Phase 2 可演示路径

1. 登录系统：`admin / admin123`
2. 打开「Agent 工具中心」
3. 运行 CGPA 换算、院校推荐、销售话术生成
4. 查看结构化输出和最近调用日志
5. 打开「AI 对话工作台」查看工具调用提示

## 下一阶段：Phase 3

- 文档上传
- 文档列表
- 文档解析
- chunk 切片
- 文档切片预览
- 为 Phase 4 RAG 检索做准备
