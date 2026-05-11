EduAgent 知识库持久化补丁

本补丁包含：
1. backend/src/modules/documents/documents.service.ts
   - 知识库 documents / chunks 写入 Supabase
   - 知识库列表从 Supabase 读取
   - 查看切片从 Supabase 读取
   - 删除文档时同步删除 Supabase 数据
   - 数据库异常时自动回退 MemoryStore

2. backend/src/modules/chat/chat.service.ts
   - AI 对话 RAG 检索优先读取 Supabase chunks
   - 如果 Supabase 没命中或异常，自动回退 MemoryStore 种子知识库

3. docs/supabase-knowledge-tables.sql
   - 需要复制到 Supabase SQL Editor 执行，创建 documents 和 chunks 表

使用步骤：
1. 先在 Supabase SQL Editor 执行 docs/supabase-knowledge-tables.sql 里的 SQL。
2. 解压补丁，把 backend 和 docs 文件夹拖到 GitHub 仓库根目录，覆盖同名文件。
3. Commit message: persist knowledge base documents and chunks
4. 等 Render 部署成功。
5. 打开前端知识库页面，新增一篇文档。
6. 回 Supabase Table Editor 查看 documents 和 chunks 表是否有数据。
7. 去 AI 对话页问和新增文档相关的问题，看“来源引用”是否出现新文档。
