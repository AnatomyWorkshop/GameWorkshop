# 前端 MVP 初始化日志

> 日期：2026-04-09
> 阶段：Phase 1 — 最小可展示子集（游戏列表 + 详情页 + text 游戏游玩页）

---

## 已完成的工作

### 项目初始化

- `package.json` 手动创建（`pnpm create vite` 因目录非空交互失败）
- `pnpm install` 安装所有依赖
- `vite.config.ts`：`@tailwindcss/vite` 插件 + `/api` 代理到 `localhost:8080`
- `tsconfig.json`：strict 模式 + `@/*` 路径别名
- `index.html`：标准入口

### API 层（`src/api/`）

| 文件 | 职责 |
|------|------|
| `client.ts` | fetch 封装，统一 baseURL / Content-Type / 错误抛出（`ApiError`） |
| `types.ts` | 所有 API 响应类型（`Game`, `Session`, `Floor`, `TurnResponse`, `WorldbookEntry` 等） |
| `games.ts` | `gamesApi.list()` / `.get()` / `.worldbook()` |
| `sessions.ts` | `sessionsApi.list()` / `.get()` / `.create()` / `.update()` / `.floors()` |
| `social.ts` | `socialApi.react()` / `.unreact()` |
| `sse.ts` | `streamTurn()` — 封装 `@microsoft/fetch-event-source`，处理 delta/done/error 事件 |

### 状态管理（`src/stores/`）

| 文件 | 职责 |
|------|------|
| `stream.ts` | SSE 流式状态：`streaming` / `buffer` / `startStream` / `appendDelta` / `endStream` |
| `ui.ts` | 全局 UI 开关：`worldbookOpen` / `sidebarOpen` |

**注意**：Zustand 只管理无法放入 TanStack Query 的状态（流式缓冲、UI 开关）。服务端数据全部走 TQ。

### TanStack Query 钩子（`src/queries/`）

| 文件 | 钩子 |
|------|------|
| `games.ts` | `useGameList()`（无限滚动）/ `useGame(slug)` / `useWorldbook(gameId, enabled)` |
| `sessions.ts` | `useSessionList(gameId)` / `useFloors(sessionId)` / `useCreateSession()` |

### 路由与入口（`src/router/`, `src/App.tsx`, `src/main.tsx`）

- `AppLayout` 包裹首页 + 详情页（有顶部导航栏）
- `PlayPage` 在 `AppLayout` 外（全屏，无导航栏）
- `QueryClient` 在 `App.tsx` 顶层提供，`staleTime: 30s`

### 页面（`src/pages/`）

| 路径 | 文件 | 说明 |
|------|------|------|
| `/` | `game-list/GameListPage.tsx` | 游戏列表，无限滚动，路由分发 |
| `/games/:slug` | `game/GameDetailPage.tsx` | 游戏详情，封面 + 统计 + 开始游玩 |
| `/play/:sessionId` | `play/PlayPage.tsx` | 游玩页，消息流 + SSE 输入 |

### 组件（`src/components/`）

| 文件 | 说明 |
|------|------|
| `layout/AppLayout.tsx` | 顶部导航栏 + `<Outlet />` |
| `game/GameCard.tsx` | 纯展示卡片，路由逻辑由父页面通过 `onClick` 注入 |
| `chat/MessageList.tsx` | react-virtuoso 虚拟滚动，支持流式 buffer 追加 |
| `chat/MessageBubble.tsx` | user/assistant 气泡，react-markdown + remark-gfm |
| `chat/ChatInput.tsx` | 多行输入 + Enter 发送 + 流式禁用 |

---

## 命名审查与修正

本次初始化后发现以下命名问题，已修正：

| 原命名 | 修正后 | 原因 |
|--------|--------|------|
| `src/pages/home/HomePage.tsx` | `src/pages/game-list/GameListPage.tsx` | `home` 太宽泛；首页未来会有论坛热帖、分享流等区块，当前页面只是游戏列表 |
| `src/stores/play.ts` (`usePlayStore`) | `src/stores/stream.ts` (`useStreamStore`) | `play` 描述的是游玩功能域，而这个 store 只管理 SSE 流式缓冲状态 |
| `GameCard` 内含路由逻辑 | `GameCard` 纯展示，`onClick` 由父页面注入 | 卡片组件不应知道"text 游戏跳 play、其他跳详情"的业务规则；这是页面级决策 |

---

## 当前范围边界（MVP 子集）

**已实现**：
- 游戏列表页（无限滚动，按类型/标签/排序过滤）
- 游戏详情页（封面 + 统计 + 开始游玩按钮）
- text 游戏游玩页（消息流 + SSE 流式输出 + 虚拟滚动）

**明确未实现（后续阶段）**：
- light 游戏界面（`CharacterPortrait` / `CharacterSelector` / `StatusBar`）
- rich-A 游戏界面（`VNScene` / `VNDialog` / `AudioPlayer`）
- rich-B 游戏界面（`IframeGame` + postMessage 桥接）
- 游戏论坛（`PostList` / `PostCard` / `ReplyTree`）
- 评论区（`CommentCore` / `LinearFeedComment` / `NestedThreadComment`）
- 常驻角色浮窗（`ResidentCharacterPanel`）
- 首页分享流（社区帖子 + 热门游记）
- 工具面板抽屉（`WorldbookPanel` / `VariablePanel` / `MemoryPanel` / `HistoryPanel`）
- 用户认证（`AuthPage`）

---

## 解耦原则遵守情况

✅ `GameCard` 是纯展示组件，不含路由/业务逻辑  
✅ `stream.ts` 只管流式状态，不混入游戏业务状态  
✅ `game-list/` 目录名描述的是"游戏列表"功能，不是"首页"概念  
✅ `chat/` 组件（`MessageList` / `MessageBubble` / `ChatInput`）对游戏类型无感知，text/light/rich-A 均可复用  
✅ `PlayPage` 当前只组合 text 游戏所需组件，light/rich 扩展时只需在 `PlayPage` 内按 `game.type` 条件渲染新组件，不需要重写现有组件  
⚠️ `PlayPage` 目前没有读取 `game.type` 来决定渲染路径（因为只有 text），后续加 light 时需要在此处加分支

---

## 下一步

1. `GameDetailPage` 补全：`HeroSection` / `ActionBar` / `StatsBar` / `TabNav`
2. `CommentCore`（评论区只读列表，无限滚动）
3. `PostList`（攻略/游记帖子列表）
4. `PlayPage` 补全：`HamburgerMenu` Phase 1 功能（重生成 / 分叉 / 存档管理）
5. `WorldbookPanel` 抽屉（游戏世界书只读）
