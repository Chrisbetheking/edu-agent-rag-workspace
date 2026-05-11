EduAgent Supabase 持久化补丁

包含文件：
1. backend/package.json
   - 新增 pg 和 @types/pg 依赖

2. backend/src/shared/database.service.ts
   - 新增 Supabase PostgreSQL 连接服务

3. backend/src/shared/shared.module.ts
   - 把 DatabaseService 注册为全局服务

4. backend/src/modules/chat/chat.service.ts
   - AI 对话仍然先走 MemoryStore，保证页面不坏
   - 同时双写 Supabase：conversations / messages / call_logs
   - 顺手缩短 DeepSeek JSON 输出要求，降低被截断概率

使用方式：
1. 解压这个 zip。
2. 把里面的 backend 文件夹拖到 GitHub 仓库根目录上传，选择覆盖同名文件。
3. 提交 commit，建议 commit message：add supabase persistence for chat logs
4. 等 Render 自动部署。
5. 部署成功后，在前端 AI 对话页生成一次回答。
6. 回 Supabase Table Editor 查看 conversations / messages / call_logs 是否出现数据。

注意：
- 不要把 zip 本身直接上传到 GitHub；要解压后上传里面的 backend 文件夹或对应文件。
- Render 里必须已经配置 DATABASE_URL。
- Supabase 里必须已经建好 conversations / messages / call_logs 三张表。
