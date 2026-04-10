# GameWorkshop 前端技术方案

> 状态：规划中（2026-04-08）
> 目标：替代 `frontend-v2/GameWorkshop`（Vue3），用 React + TypeScript 重写 GW 玩家端。

---

## 为什么换 React

- **生态更大**：shadcn/ui、Radix UI、Framer Motion 覆盖我们需要的所有 UI 场景
- **TypeScript 支持更原生**：类型推导更准确，尤其是 hooks + 泛型组合
- **SSE / Streaming 处理库更丰富**：`@microsoft/fetch-event-source`、`eventsource-parser` 等
- **状态管理选项更好**：Zustand（轻量 + 直接）vs Pinia（更像 Vuex）
- **视觉小说方向**：如果后续引入 Live2D 或 PixiJS，React 的 `useRef` + imperative API 更自然

---

## 技术栈选型

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | React 19 + TypeScript | 稳定，生态最大 |
| 构建 | Vite 6 | 快，配置简单 |
| 路由 | React Router v7 | loader/action 模式干净 |
| 状态 | Zustand | 轻量，不需要 Redux 的样板代码 |
| 服务端状态 | TanStack Query v5 | 缓存 / 重试 / 分页开箱即用 |
| UI 基础 | shadcn/ui + Tailwind CSS v4 | 组件直接拷进 src，可完全定制 |
| 动画 | Framer Motion | 场景切换 / 浮窗展开效果 |
| SSE 流式 | `@microsoft/fetch-event-source` | 支持 POST + 自动重连，优于原生 EventSource |
| 图标 | Lucide React | 轻量，tree-shakeable |
| 表单 | React Hook Form + Zod | 最少样板代码，类型安全验证 |
| 测试 | Vitest + Testing Library | Vite 原生，速度快 |

---

## 目录结构

```
GameWorkshop/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts          # fetch 封装（baseURL / headers / error handling）
│   │   ├── sse.ts             # SSE 流式封装（fetch-event-source）
│   │   └── types.ts           # API 响应类型定义
│   ├── stores/
│   │   ├── session.ts         # 游戏会话状态（Zustand）
│   │   ├── user.ts            # 用户信息 / auth token
│   │   └── ui.ts              # 全局 UI 状态（侧边栏 / 模态框）
│   ├── router/
│   │   └── index.tsx          # React Router 路由表
│   ├── pages/
│   │   ├── Home/              # 首页：游戏列表 + 社区帖子流
│   │   ├── Play/              # 游玩页：聊天 UI + SSE + 视觉小说渲染
│   │   ├── Forum/             # 论坛：帖子列表 / 详情 / 发帖
│   │   ├── GameDetail/        # 游戏详情：介绍 + 社交聚合统计
│   │   └── Auth/              # 登录 / 注册
│   ├── components/
│   │   ├── chat/
│   │   │   ├── MessageList.tsx    # 消息列表（虚拟滚动，长对话）
│   │   │   ├── MessageBubble.tsx  # 单条消息（支持 Markdown 渲染）
│   │   │   ├── ChatInput.tsx      # 输入框 + 发送 + 重试
│   │   │   └── StreamingDot.tsx   # 流式输出加载动画
│   │   ├── vn/
│   │   │   ├── VNScene.tsx        # 视觉小说场景（背景 / 立绘 / 对话框）
│   │   │   ├── VNDialog.tsx       # 对话框组件
│   │   │   └── VNChoices.tsx      # 选项按钮组
│   │   ├── forum/
│   │   │   ├── PostCard.tsx
│   │   │   ├── ReplyTree.tsx      # 嵌套楼层
│   │   │   └── MarkdownEditor.tsx # 发帖编辑器（CodeMirror 或 textarea）
│   │   └── ui/                # shadcn/ui 生成的基础组件
│   ├── hooks/
│   │   ├── useSSE.ts          # 封装 SSE 流式消息处理
│   │   ├── useSession.ts      # 游戏会话生命周期
│   │   └── useInfiniteList.ts # TanStack Query 无限滚动封装
│   └── styles/
│       └── globals.css        # Tailwind base + CSS 变量（主题）
```

---

## 关键设计决策

### 1. SSE 流式处理

后端 `/api/play/sessions/:id/chat` 返回 SSE 流。需要处理：
- 流式追加消息内容（逐字符/逐 token 追加到 Zustand store）
- 流结束标记（`data: [DONE]`）
- 网络断开自动重连
- 并发请求队列（防止用户连续点击）

```typescript
// hooks/useSSE.ts 核心思路
const sendMessage = async (content: string) => {
  const source = fetchEventSource(`/api/play/sessions/${sessionId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ content }),
    onmessage(event) {
      if (event.data === '[DONE]') return finalize()
      appendToken(event.data)  // 写入 Zustand
    },
    onerror(err) { retry() },
  })
}
```

### 2. 游戏状态模型（Zustand）

```typescript
// stores/session.ts
interface SessionStore {
  sessionId: string | null
  messages: Message[]
  gameState: Record<string, unknown>  // AI 更新的变量（hp / tension 等）
  isStreaming: boolean
  streamingContent: string            // 当前正在流式输出的内容
  
  // actions
  startSession: (gameId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  retryLast: () => Promise<void>
}
```

### 3. 视觉小说模式

后端 Parser 返回 `vn` 字段（背景 / 立绘 / BGM 指令）。前端需要：
- `VNScene` 组件：CSS 过渡切换背景、立绘入场/退场动画（Framer Motion）
- 对话框 typewriter 效果（逐字显示，配合 SSE 流式）
- 纯 CSS 驱动，不引入 PixiJS（MVP 阶段）

### 4. 路由策略

```
/                   首页（游戏推荐 + 论坛热帖）
/games              游戏目录
/games/:slug        游戏详情（介绍 + 评论 + 论坛帖）
/play/:sessionId    游玩页（聊天 or 视觉小说）
/forum              论坛主页
/forum/:postId      帖子详情
/create             创作入口（跳转 CW，或内嵌简易版）
/auth               登录 / 注册
```

### 5. 与后端 API 对接约定

- Base URL：`/api`（Vite proxy 开发时转发 `http://localhost:8080`）
- Auth：`Authorization: Bearer <token>` header，token 存 `localStorage`（MVP）
- 匿名访问：后端 `ALLOW_ANONYMOUS=true` 时，游玩/查看接口无需 token
- 错误格式：`{ error: string }` 或 `{ code: number, data: ... }`

---

## 与 Vue3 版本的差异

| 功能 | Vue3 (frontend-v2) | React (GameWorkshop) |
|------|-------------------|---------------------|
| 流式输出 | EventSource + reactive | fetch-event-source + Zustand |
| 路由 | Vue Router | React Router v7 |
| 状态 | Pinia | Zustand |
| UI | 零 UI 库 + CSS 变量 | shadcn/ui + Tailwind |
| VN 渲染 | 基础 CSS | Framer Motion 动画 |
| 测试 | 无 | Vitest + Testing Library |

---

## MVP 范围（第一版目标）

- [ ] 游戏列表页 + 详情页
- [ ] 聊天游玩页（SSE 流式，含重试）
- [ ] 视觉小说基础渲染（背景 + 立绘 + 对话框）
- [ ] 论坛帖子列表 + 详情（含盖楼）
- [ ] 游戏评论区（线性模式）
- [ ] 匿名游玩（无需注册）

暂不做：

- 登录 / 注册（后端支持匿名模式）
- 发帖 / 评论（只读，先做展示）
- 存档管理

---

## 初始化步骤

```bash
cd D:/ai-game-workshop/GameWorkshop

# 创建项目
pnpm create vite . --template react-ts
pnpm install

# 核心依赖
pnpm add react-router-dom zustand @tanstack/react-query
pnpm add @microsoft/fetch-event-source
pnpm add framer-motion lucide-react

# UI
pnpm add -D tailwindcss @tailwindcss/vite
pnpm dlx shadcn@latest init

# 表单 / 验证
pnpm add react-hook-form zod @hookform/resolvers

# 测试
pnpm add -D vitest @testing-library/react @testing-library/user-event jsdom
```
