# 下一步：阶段 2 任务

阶段 1 完成后，先做阶段 2，不要急着接大模型 API。

## 阶段 2 目标

把旧纯前端 Demo 的核心业务能力迁移成后端工具接口 + 前端工具页面。

## 需要完成

1. CGPA 换算工具
2. 院校推荐工具
3. 销售话术生成工具
4. 工具调用结果展示
5. 工具调用日志接口

## 推荐接口

```txt
POST /api/tools/cgpa-convert
POST /api/tools/school-recommend
POST /api/tools/copywriting
GET  /api/tools/logs
```

## 面试讲法

> 阶段 1 我先完成了前后端工程骨架。阶段 2 开始，我把原来 v1 纯前端 Demo 里的 GPA 换算、院校推荐、申请文案生成能力迁移成后端 Agent Tool 接口，让工具调用可以被记录、追踪和后续接入模型调度。
