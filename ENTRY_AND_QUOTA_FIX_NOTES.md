# Entry + Guest Quota Fix

本次修复针对两个线上体验问题：

1. 直接打开根域名会进入管理台，而不是一个更适合作品集展示的入口页。
2. 访客调用前台增长、申请后台、Agent 工具等 AI 功能后，左侧剩余额度不更新。

## 已调整

- 新增 `frontend/src/pages/Landing.tsx`
  - 根路径 `/` 现在是公开作品集入口页。
  - HR / 面试官点击「进入访客体验」后才创建 guest token 并进入 `/workspace`。
  - 管理员入口弱化为右下角 `Owner Console`，不会展示测试密码。

- 修改 `frontend/src/App.tsx`
  - `/`：公开 Landing。
  - `/workspace`：原工作台首页，需要登录或访客 token。
  - `/frontdesk`、`/applications`、`/tools` 等仍然是受保护的工作台页面。

- 修改 `frontend/src/components/Layout.tsx`
  - 左侧「工作台」导航改为 `/workspace`。

- 修改 `frontend/src/store/auth.ts`
  - 登录缓存版本升级到 `v3-public-landing-guest-quota`，旧浏览器 token 会自动失效。

- 修改 `backend/src/modules/tools/tools.controller.ts`
  - AI 工具接口现在会消耗访客额度并返回 `quota`。
  - `advisor-suite` 完整 Agent 流只扣 1 次，更适合演示。
  - `cgpa-convert` 和 `material-list` 是本地规则工具，不扣 AI 次数，但会返回当前 quota。

- 修改 `frontend/src/api/client.ts` 和 `frontend/src/api/http.ts`
  - 所有接口返回里只要带 `quota`，前端会自动同步左侧「剩余 AI 次数」。

## 体验建议

公开作品集建议使用：

- 根域名 `/`：给 HR / 面试官看的产品介绍 + 访客体验入口。
- `/workspace`：访客或管理员进入后的真实工作台。
- `/login`：隐藏管理员入口，仅自己使用。

这样比“打开就是登录页”更像正式 SaaS 产品，也不会暴露测试密码。
